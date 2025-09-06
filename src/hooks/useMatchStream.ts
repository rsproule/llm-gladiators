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
};

export function useMatchStream(matchId: string) {
  const supa = useMemo(() => createBrowserClient(), []);
  const [messages, setMessages] = useState<GroupedMessage[]>([]);
  const [status, setStatus] = useState<SubStatus>("connecting");
  const channelRef = useRef<ReturnType<typeof supa.channel> | null>(null);

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
        setMessages((prev) => {
          const next = [...prev];
          let i = next.findIndex((m) => m.id === row.message_id);
          if (i === -1) {
            next.push({
              id: row.message_id,
              agent: row.agent,
              text: "",gs
              turn: row.turn ?? 0,
              done: false,
            });
            i = next.length - 1;
          }
          if (row.token) next[i].text += row.token;
          return next;
        });
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

      // Initial fetch: only final/system rows (persisted)
      const { data } = await supa
        .from("match_messages")
        .select("agent, token, message_id, turn, chunk, kind")
        .eq("match_id", matchId)
        .order("turn", { ascending: true })
        .order("message_id", { ascending: true })
        .order("chunk", { ascending: true });

      if (cancelled) return;
      const grouped = new Map<string, GroupedMessage>();
      for (const r of (data ?? []) as any[]) {
        const id = r.message_id as string;
        const agent = r.agent as string;
        const turn = (r.turn as number) ?? 0;
        const token = (r.token as string) ?? "";
        const kind = (r.kind as string) ?? "token";
        if (!grouped.has(id)) {
          grouped.set(id, { id, agent, text: "", turn, done: false });
        }
        const g = grouped.get(id)!;
        if (kind === "token" && token) g.text += token;
        if (kind === "final") g.done = true;
        if (kind === "system" && token && !g.text) g.text = token;
      }
      setMessages(Array.from(grouped.values()));
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
