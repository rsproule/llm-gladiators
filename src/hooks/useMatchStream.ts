"use client";
import { createBrowserClient } from "@/utils/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";

export type SubStatus = "connecting" | "listening" | "disconnected";

type GroupedMessage = {
  id: string;
  agent: string;
  text: string;
  turn: number;
  done: boolean;
  order?: number;
};

export function useMatchStream(matchId: string) {
  const supa = useMemo(() => createBrowserClient(), []);
  const [messages, setMessages] = useState<GroupedMessage[]>([]);
  const [status, setStatus] = useState<SubStatus>("connecting");
  const channelRef = useRef<ReturnType<typeof supa.channel> | null>(null);
  const lastChunkRef = useRef<Map<string, number>>(new Map());
  const orderCounterRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setStatus("connecting");

      // Subscribe to broadcast for live tokens/finals
      const ch = supa.channel(`match-${matchId}`);
      channelRef.current = ch;

      ch.on("broadcast", { event: "agent-token" }, ({ payload }) => {
        console.log("agent-token", payload);
        if (cancelled) return;
        const row = payload as {
          message_id: string;
          agent: string;
          turn?: number;
          chunk?: number;
          token?: string;
        };
        const last = lastChunkRef.current.get(row.message_id) ?? -1;
        if (typeof row.chunk === "number" && row.chunk <= last) return;
        setMessages((prev) => {
          const next = [...prev];
          let i = next.findIndex((m) => m.id === row.message_id);
          if (i === -1) {
            next.push({
              id: row.message_id,
              agent: row.agent,
              text: "",
              turn: row.turn ?? 0,
              done: false,
              order: orderCounterRef.current++,
            });
            i = next.length - 1;
          }
          if (row.token) next[i].text += row.token;
          return next;
        });
        if (typeof row.chunk === "number") {
          lastChunkRef.current.set(row.message_id, row.chunk);
        }
      });

      ch.on("broadcast", { event: "agent-final" }, ({ payload }) => {
        console.log("agent-final", payload);
        if (cancelled) return;
        const row = payload as { message_id: string };
        setMessages((prev) => {
          const next = [...prev];
          const i = next.findIndex((m) => m.id === row.message_id);
          if (i !== -1) next[i].done = true;
          return next;
        });
      });

      await ch.subscribe();
      if (cancelled) return;
      setStatus("listening");
      ch.on("broadcast", { event: "arena-complete" }, () => {
        if (channelRef.current) {
          supa.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        setStatus("disconnected");
      });

      // Initial fetch: load all columns and sort by DB id (stable)
      const { data } = await supa
        .from("match_messages")
        .select("*")
        .eq("match_id", matchId)
        .order("id", { ascending: true });

      if (cancelled) return;
      const grouped = new Map<string, GroupedMessage & { idMin?: number }>();
      for (const r of (data ?? []) as any[]) {
        const id = r.message_id as string;
        const agent = r.agent as string;
        const turn = (r.turn as number) ?? 0;
        const token = (r.token as string) ?? "";
        const kind = (r.kind as string) ?? "token";
        const rowId = typeof r.id === "number" ? (r.id as number) : undefined;
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
        if (kind === "token" && token) g.text += token;
        if (kind === "final") {
          g.done = true;
          if (token && !g.text) g.text = token; // ensure refresh shows full text when only final was persisted
        }
        if (kind === "system" && token && !g.text) g.text = token;
        if (typeof rowId === "number") {
          g.idMin =
            typeof g.idMin === "number" ? Math.min(g.idMin, rowId) : rowId;
        }
      }
      const finalized = Array.from(grouped.values()).map((g) => ({
        id: g.id,
        agent: g.agent,
        text: g.text,
        turn: g.turn,
        done: g.done,
        order: g.idMin,
      }));
      orderCounterRef.current = finalized.length;
      setMessages(finalized);
    };

    run();
    return () => {
      cancelled = true;
      if (channelRef.current) {
        supa.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setStatus("disconnected");
    };
  }, [matchId, supa]);

  return { messages, status };
}
