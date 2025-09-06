"use client";
import { MessageLog } from "@/components/MessageLog";
import { StatusDot } from "@/components/StatusDot";
import { useMatchStream } from "@/hooks/useMatchStream";
import { useEffect, useRef, useState } from "react";

function ArenaInner() {
  const [matchId, setMatchId] = useState<string>("public-1234");
  const [running, setRunning] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const { messages, status } = useMatchStream(matchId);

  // streaming handled by hook

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
      console.error("/api/arena error", err);
      setRunning(false);
    });
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Arena</h1>
      <div className="mt-3 flex gap-2">
        <input
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
          placeholder="match id"
          className="flex-1 rounded-md border border-gray-300 bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-gray-400"
        />
        <button
          onClick={trigger}
          disabled={running}
          className="rounded-md bg-foreground px-3 py-2 text-background disabled:opacity-50"
        >
          {running ? "Running..." : "Start"}
        </button>
      </div>

      <StatusDot status={status} />

      <div ref={listRef}>
        <MessageLog messages={messages} />
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
