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

// Module-level dedupe to survive StrictMode remounts or multiple listeners
const globalProcessedChunkKeys: Set<string> = new Set();
const DEBUG_STREAM = true;
function dbg(...args: any[]) {
  if (!DEBUG_STREAM) return;
  // eslint-disable-next-line no-console
  console.log("[useMatchStream]", ...args);
}

type StreamState = {
  status: SubStatus;
  messages: GroupedMessage[];
  lastChunkByMessage: Record<string, number>;
  processedChunks: Record<string, true>;
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
      const key = `${message_id}:${chunk}`;
      if (state.processedChunks[key]) {
        dbg("reducer skip: processed", { key });
        return state;
      }
      if (state.finalized[message_id]) {
        dbg("reducer skip: finalized", { message_id });
        return state;
      }
      const last = state.lastChunkByMessage[message_id] ?? -1;
      if (typeof chunk === "number" && chunk <= last) {
        dbg("reducer skip: out_of_order_or_dup", { message_id, chunk, last });
        return state;
      }

      const nextMessages = [...state.messages];
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
      if (nextMessages[i].done) {
        dbg("reducer skip: already_done", { message_id });
        return state;
      }
      if (token) nextMessages[i].text += token;
      dbg("reducer append", { key, len: nextMessages[i].text.length });
      return {
        ...state,
        messages: nextMessages,
        lastChunkByMessage: {
          ...state.lastChunkByMessage,
          ...(typeof chunk === "number" ? { [message_id]: chunk } : {}),
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
    const instanceId = Math.random().toString(36).slice(2, 8);
    dbg("init", { instanceId, matchId });
    dispatch({ type: "connecting" });

    const ch = supa.channel(`match-${matchId}`);
    dbg("channel created", { instanceId, topic: `match-${matchId}` });

    ch.on("broadcast", { event: "agent-token" }, ({ payload }) => {
      if (cancelled) return;
      const row = payload as {
        message_id: string;
        agent: string;
        turn?: number;
        chunk?: number;
        token?: string;
      };
      const chunkKey = `${row.message_id}:${row.chunk}`;
      if (typeof row.chunk === "number") {
        if (globalProcessedChunkKeys.has(chunkKey)) {
          dbg("skip duplicate token", {
            instanceId,
            chunkKey,
            reason: "globalProcessedChunkKeys",
          });
          return;
        }
        globalProcessedChunkKeys.add(chunkKey);
      }
      dbg("token", {
        instanceId,
        message_id: row.message_id,
        chunk: row.chunk,
        agent: row.agent,
      });
      dispatch({ type: "token", payload: row });
    });

    ch.on("broadcast", { event: "agent-final" }, async ({ payload }) => {
      if (cancelled) return;
      const row = payload as { message_id: string };
      dbg("final received", { instanceId, message_id: row.message_id });
      const { data: finalRow } = await supa
        .from("match_messages")
        .select("agent, turn, token")
        .eq("message_id", row.message_id)
        .eq("kind", "final")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      dbg("final fetched", {
        instanceId,
        message_id: row.message_id,
        hasRow: !!finalRow,
      });
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
      dbg("subscribe status", { instanceId, status });
      if (cancelled) return;
      if (status === "SUBSCRIBED") {
        dispatch({ type: "listening" });
        ch.on("broadcast", { event: "arena-complete" }, () => {
          dbg("arena-complete", { instanceId });
          if (!cancelled) dispatch({ type: "disconnected" });
        });
      }
    });

    (async () => {
      dbg("initial fetch start", { instanceId });
      const { data } = await supa
        .from("match_messages")
        .select("*")
        .eq("match_id", matchId)
        .order("id", { ascending: true });
      dbg("initial fetch done", { instanceId, rows: (data ?? []).length });
      if (cancelled) return;
      dispatch({ type: "initial", payload: { rows: (data ?? []) as any[] } });
    })();

    return () => {
      cancelled = true;
      dbg("cleanup", { instanceId });
      supa.removeChannel(ch);
      dispatch({ type: "disconnected" });
    };
  }, [matchId, supa]);

  return { messages: state.messages, status: state.status };
}
