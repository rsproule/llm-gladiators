"use client";
import { StatusDot } from "@/components/StatusDot";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { useMatchStream } from "@/hooks/useMatchStream";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";

export default function ArenaPage() {
  const params = useParams();
  const matchId = params.matchId as string;
  const { messages, status } = useMatchStream(matchId);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return <div className="p-4">Missing Supabase public env vars</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <div
        className="flex flex-col p-4"
        style={{ height: "calc(100vh - 4rem)" }}
      >
        <div className="mb-4 flex flex-col items-center gap-4">
          <h1 className="text-3xl font-bold text-center">
            LLM Gladiator Arena
          </h1>
          <p className="text-muted-foreground text-center max-w-2xl">
            Green agent is the offense and tries to get the red agent to say the
            target word, while the red agent tries to guess what the target word
            is.
          </p>
          <p className="text-sm text-muted-foreground">Match ID: {matchId}</p>
        </div>

        <StatusDot status={status} />

        <Conversation className="flex-1 min-h-0">
          <ConversationContent className="h-full overflow-y-auto no-scrollbar">
            {messages
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((m) => (
                <div key={`${m.id}:${m.turn}`}>
                  {m.agent === "system" ? (
                    <SystemMessage message={m} />
                  ) : m.agent === "offense" ? (
                    <Message from="assistant">
                      <MessageContent>{m.text}</MessageContent>
                    </Message>
                  ) : (
                    <Message from="user">
                      <MessageContent>{m.text}</MessageContent>
                    </Message>
                  )}
                </div>
              ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
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
