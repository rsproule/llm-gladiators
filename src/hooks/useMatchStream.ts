"use client";
import { createBrowserClient } from "@/utils/supabase/client";
import { useEffect, useMemo, useReducer } from "react";

export type SubStatus = "connecting" | "listening" | "disconnected";

type GroupedMessage = {
  id: string;
  agent: string;
  text: string;
  turn: number;
  done: boolean;
  order?: number;
};

type StreamState = {
  status: SubStatus;
  messages: GroupedMessage[];
  lastChunkByMessage: Record<string, number>;
  processedChunks: Record<string, true>; // strict dedupe by message_id:chunk only
  finalized: Record<string, true>;
  orderCounter: number;
};

type Action =
  | { type: "connecting" }
  | { type: "listening" }
  | { type: "disconnected" }
  | {
      type: "token";
      payload: {
        message_id: string;
        agent: string;
        turn?: number;
        chunk?: number;
        token?: string;
      };
    }
  | {
      type: "final";
      payload: {
        message_id: string;
        agent: string;
        turn: number;
        text: string;
      };
    }
  | {
      type: "initial";
      payload: {
        rows: Array<{
          message_id: string;
          agent: string;
          turn: number;
          token: string;
          kind: string;
          id?: number;
        }>;
      };
    };

function reducer(state: StreamState, action: Action): StreamState {
  switch (action.type) {
    case "connecting":
      return { ...state, status: "connecting" };
    case "listening":
      return { ...state, status: "listening" };
    case "disconnected":
      return { ...state, status: "disconnected" };
    case "initial": {
      const grouped = new Map<string, GroupedMessage & { idMin?: number }>();
      const finalized: Record<string, true> = { ...state.finalized };
      for (const r of action.payload.rows) {
        const id = r.message_id;
        const agent = r.agent;
        const turn = r.turn ?? 0;
        const token = r.token ?? "";
        const kind = r.kind ?? "token";
        const rowId = typeof r.id === "number" ? r.id : undefined;
        if (!grouped.has(id)) {
          grouped.set(id, {
            id,
            agent,
            text: "",
            turn,
            done: false,
            idMin: rowId,
          });
        }
        const g = grouped.get(id)!;
        if (kind === "final") {
          g.done = true;
          if (token && !g.text) g.text = token;
          finalized[id] = true;
        }
        if (kind === "system" && token && !g.text) g.text = token;
        if (typeof rowId === "number") {
          g.idMin =
            typeof g.idMin === "number" ? Math.min(g.idMin, rowId) : rowId;
        }
      }
      const finalizedArr = Array.from(grouped.values()).map((g) => ({
        id: g.id,
        agent: g.agent,
        text: g.text,
        turn: g.turn,
        done: g.done,
        order: g.idMin,
      }));
      return {
        ...state,
        messages: finalizedArr,
        orderCounter: finalizedArr.length,
        finalized,
      };
    }
    case "token": {
      const { message_id, agent, turn, chunk, token } = action.payload;
      const chunkNum = typeof chunk === "number" ? chunk : Number(chunk ?? 0);
      const key = `${message_id}:${chunkNum}`;
      if (state.processedChunks[key]) return state;
      if (state.finalized[message_id]) return state;
      const last = state.lastChunkByMessage[message_id] ?? -1;
      if (typeof chunkNum === "number" && chunkNum <= last) return state;

      // Important: deep clone message objects to keep reducer pure.
      // Copying only the array causes object mutation to leak into prev state,
      // which Strict Mode double-invocation will observe and append twice.
      const nextMessages = state.messages.map((m) => ({ ...m }));
      let i = nextMessages.findIndex((m) => m.id === message_id);
      if (i === -1) {
        nextMessages.push({
          id: message_id,
          agent,
          text: "",
          turn: turn ?? 0,
          done: false,
          order: state.orderCounter,
        });
        i = nextMessages.length - 1;
      }
      if (nextMessages[i].done) return state;
      // Handle providers that emit cumulative full text frames instead of deltas
      let toAppend = token ?? "";
      const existing = nextMessages[i].text;
      if (toAppend) {
        if (toAppend.startsWith(existing)) {
          toAppend = toAppend.slice(existing.length);
        } else if (existing.startsWith(toAppend)) {
          toAppend = "";
        }
      }
      if (toAppend) nextMessages[i].text += toAppend;
      return {
        ...state,
        messages: nextMessages,
        lastChunkByMessage: {
          ...state.lastChunkByMessage,
          ...(typeof chunkNum === "number" ? { [message_id]: chunkNum } : {}),
        },
        processedChunks: { ...state.processedChunks, [key]: true },
        orderCounter:
          i === nextMessages.length - 1
            ? state.orderCounter + 1
            : state.orderCounter,
      };
    }
    case "final": {
      const { message_id, agent, turn, text } = action.payload;
      const nextMessages = [...state.messages];
      const i = nextMessages.findIndex((m) => m.id === message_id);
      if (i === -1) {
        nextMessages.push({
          id: message_id,
          agent,
          text,
          turn,
          done: true,
          order: state.orderCounter,
        });
      } else {
        nextMessages[i] = { ...nextMessages[i], agent, text, turn, done: true };
      }
      return {
        ...state,
        messages: nextMessages,
        finalized: { ...state.finalized, [message_id]: true },
      };
    }
    default:
      return state;
  }
}

export function useMatchStream(matchId: string) {
  const supa = useMemo(() => createBrowserClient(), []);
  const [state, dispatch] = useReducer(reducer, {
    status: "connecting",
    messages: [],
    lastChunkByMessage: {},
    processedChunks: {},
    finalized: {},
    orderCounter: 0,
  } as StreamState);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "connecting" });

    const ch = supa.channel(`match-${matchId}`);

    ch.on("broadcast", { event: "agent-token" }, ({ payload }) => {
      if (cancelled) return;
      const row = payload as {
        message_id: string;
        agent: string;
        turn?: number;
        chunk?: number;
        token?: string;
        source_id?: string;
      };
      if (
        row.source_id &&
        row.source_id !== `arena:${matchId}` &&
        row.agent !== "system"
      )
        return;
      dispatch({ type: "token", payload: row });
    });

    ch.on("broadcast", { event: "agent-final" }, async ({ payload }) => {
      if (cancelled) return;
      const row = payload as { message_id: string };
      const { data: finalRow } = await supa
        .from("match_messages")
        .select("agent, turn, token")
        .eq("message_id", row.message_id)
        .eq("kind", "final")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      dispatch({
        type: "final",
        payload: {
          message_id: row.message_id,
          agent: (finalRow as any)?.agent ?? "system",
          turn: (finalRow as any)?.turn ?? 0,
          text: (finalRow as any)?.token ?? "",
        },
      });
    });

    ch.subscribe((status) => {
      if (cancelled) return;
      if (status === "SUBSCRIBED") {
        dispatch({ type: "listening" });
        ch.on("broadcast", { event: "arena-complete" }, () => {
          if (!cancelled) dispatch({ type: "disconnected" });
        });
      }
    });

    (async () => {
      const { data } = await supa
        .from("match_messages")
        .select("*")
        .eq("match_id", matchId)
        .order("id", { ascending: true });
      if (cancelled) return;
      dispatch({ type: "initial", payload: { rows: (data ?? []) as any[] } });
    })();

    return () => {
      cancelled = true;
      supa.removeChannel(ch);
      dispatch({ type: "disconnected" });
    };
  }, [matchId, supa]);

  return { messages: state.messages, status: state.status };
}
