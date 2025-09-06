"use client";
import { StatusDot } from "@/components/StatusDot";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { useMatchStream } from "@/hooks/useMatchStream";
import { useEffect, useRef, useState } from "react";

export default function ArenaPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return <div className="p-4">Missing Supabase public env vars</div>;
  }

  const [matchId, setMatchId] = useState<string>("public-1234");
  const [running, setRunning] = useState(false);
  const { messages, status } = useMatchStream(matchId);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  console.log("messages", messages);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
    <div className="flex h-screen flex-col p-4">
      <div className="mb-2 flex items-center gap-2">
        <input
          className="flex-1 rounded-md border px-3 py-2"
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
          placeholder="match id"
        />
        <button
          className="rounded-md bg-foreground px-3 py-2 text-background disabled:opacity-50"
          onClick={trigger}
          disabled={running}
        >
          {running ? "Running..." : "Start"}
        </button>
      </div>

      <StatusDot status={status} />

      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="h-full overflow-y-auto">
          {messages
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((m) => (
              <Conversation className="relative w-full">
                <ConversationContent>
                  {m.agent === "system" ? (
                    <SystemMessage message={m} />
                  ) : m.agent === "agent1" ? (
                    <Message from="assistant">
                      <MessageContent>{m.text}</MessageContent>
                    </Message>
                  ) : (
                    <Message from="assistant">
                      <MessageContent>{m.text}</MessageContent>
                    </Message>
                  )}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
            ))}
        </ConversationContent>
      </Conversation>
    </div>
  );
}

function SystemMessage({ message }: { message: { text: string } }) {
  return (
    <div className="w-full text-center text-sm text-muted-foreground py-2">
      {message.text}
    </div>
  );
}
