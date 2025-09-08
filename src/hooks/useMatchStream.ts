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
  createdAt?: string;
};

type StreamState = {
  status: SubStatus;
  messages: GroupedMessage[];
  lastChunkByMessage: Record<string, number>;
  processedChunks: Record<string, true>; // strict dedupe by message_id:chunk only
  finalized: Record<string, true>;
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
        createdAt?: string;
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
          created_at: string;
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
      const grouped = new Map<string, GroupedMessage>();
      const finalized: Record<string, true> = { ...state.finalized };
      for (const r of action.payload.rows) {
        const id = r.message_id;
        const agent = r.agent;
        const turn = r.turn ?? 0;
        const token = r.token ?? "";
        const kind = r.kind ?? "token";
        const createdAt = r.created_at;
        if (!grouped.has(id)) {
          grouped.set(id, {
            id,
            agent,
            text: "",
            turn,
            done: false,
            createdAt,
          });
        }
        const g = grouped.get(id)!;
        if (kind === "final") {
          g.done = true;
          if (token && !g.text) g.text = token;
          finalized[id] = true;
        }
        if (kind === "system" && token && !g.text) g.text = token;
        if (createdAt && (!g.createdAt || createdAt < g.createdAt)) {
          g.createdAt = createdAt;
        }
      }
      return {
        ...state,
        messages: Array.from(grouped.values()).sort((a, b) => {
          // Sort by created_at timestamp for true chronological order
          if (a.createdAt && b.createdAt) {
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          }
          // Fallback to turn if timestamps missing
          return a.turn - b.turn;
        }),
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
        // Always append new messages to the end for live streaming
        const newMessage = {
          id: message_id,
          agent,
          text: "",
          turn: turn ?? 0,
          done: false,
          createdAt: new Date().toISOString(), // Current timestamp for new messages
        };
        nextMessages.push(newMessage);
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
      };
    }
    case "final": {
      const { message_id, agent, turn, text, createdAt } = action.payload;
      const nextMessages = state.messages.map((m) => ({ ...m }));
      const i = nextMessages.findIndex((m) => m.id === message_id);
      if (i === -1) {
        // Always append final messages to the end for live streaming
        const newMessage = {
          id: message_id,
          agent,
          text,
          turn,
          done: true,
          createdAt: createdAt || new Date().toISOString(),
        };
        nextMessages.push(newMessage);
      } else {
        nextMessages[i] = {
          ...nextMessages[i],
          agent,
          text,
          turn,
          done: true,
          createdAt: createdAt || nextMessages[i].createdAt,
        };
      }
      // Sort messages by timestamp after each final update
      const sortedMessages = nextMessages.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }
        return a.turn - b.turn;
      });
      return {
        ...state,
        messages: sortedMessages,
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
        .select("agent, turn, token, created_at")
        .eq("message_id", row.message_id)
        .eq("kind", "final")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      dispatch({
        type: "final",
        payload: {
          message_id: row.message_id,
          agent: finalRow?.agent ?? "system",
          turn: finalRow?.turn ?? 0,
          text: finalRow?.token ?? "",
          createdAt: finalRow?.created_at,
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
        .order("created_at", { ascending: true });
      if (cancelled) return;
      dispatch({ type: "initial", payload: { rows: data ?? [] } });
    })();

    return () => {
      cancelled = true;
      supa.removeChannel(ch);
      dispatch({ type: "disconnected" });
    };
  }, [matchId, supa]);

  return { messages: state.messages, status: state.status };
}
