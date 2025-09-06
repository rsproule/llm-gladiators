"use client";
import { createBrowserClient } from "@/utils/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";

type Message = { ts: string; text: string };

function ArenaInner() {
  const [matchId, setMatchId] = useState<string>("public-123");
  const [messages, setMessages] = useState<Message[]>([]);
  const [running, setRunning] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const supa = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supa.channel> | null = null;

    (async () => {
      channel = supa.channel(`realtime:match_messages:${matchId}`).on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as { agent: string; token: string };
          if (!cancelled) {
            setMessages((m) => [
              ...m,
              {
                ts: new Date().toISOString(),
                text: `${row.agent}: ${row.token}`,
              },
            ]);
          }
        },
      );

      // Ensure subscription is active before initial fetch
      await new Promise<void>((resolve) => {
        channel!.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
        });
      });

      if (cancelled) return;

      const { data: initial } = await supa
        .from("match_messages")
        .select("agent, token, seq")
        .eq("match_id", matchId)
        .order("seq", { ascending: true });
      if (!cancelled) {
        setMessages(
          (initial ?? []).map((r) => ({
            ts: new Date().toISOString(),
            text: `${r.agent}: ${r.token}`,
          })),
        );
      }
    })();

    return () => {
      cancelled = true;
      if (channel) supa.removeChannel(channel);
    };
  }, [matchId, supa]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const trigger = async () => {
    setRunning(true);
    await fetch("/api/arena", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId }),
    }).catch((err) => {
      setMessages((m) => [
        ...m,
        { ts: new Date().toISOString(), text: `error: ${String(err)}` },
      ]);
      setRunning(false);
    });
  };

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Arena</h1>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
          placeholder="match id"
          style={{ border: "1px solid #ccc", padding: 8, flex: 1 }}
        />
        <button
          onClick={trigger}
          disabled={running}
          style={{ padding: "8px 12px" }}
        >
          {running ? "Running..." : "Start"}
        </button>
      </div>

      <div
        ref={listRef}
        style={{
          border: "1px solid #e5e7eb",
          marginTop: 12,
          padding: 8,
          height: 360,
          overflowY: "auto",
          borderRadius: 6,
          background: "#fafafa",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            <span style={{ color: "#6b7280" }}>{m.ts}</span> {m.text}
          </div>
        ))}
        {messages.length === 0 && (
          <div style={{ color: "#9ca3af" }}>No messages yet</div>
        )}
      </div>
    </div>
  );
}

export default function ArenaPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return <div style={{ padding: 16 }}>Missing Supabase public env vars</div>;
  }
  return <ArenaInner />;
}
