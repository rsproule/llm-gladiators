"use client";

type GroupedMessage = {
  id: string;
  agent: string;
  text: string;
  turn: number;
  done: boolean;
};

export function MessageLog({
  messages,
  scrollRef,
}: {
  messages: GroupedMessage[];
  scrollRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={scrollRef}
      className="mt-2 flex-1 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-2 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {messages
        .sort((a, b) => a.turn - b.turn || a.id.localeCompare(b.id))
        .map((m) => (
          <div key={m.id} className="font-mono">
            <span className="mr-2 rounded bg-gray-200 px-1 py-0.5 text-xs text-gray-700 dark:bg-zinc-800 dark:text-zinc-200">
              {m.agent}
            </span>
            <span className="whitespace-pre-wrap break-words">{m.text}</span>
            {!m.done && (
              <span className="ml-1 animate-pulse text-gray-400">▌</span>
            )}
          </div>
        ))}
      {messages.length === 0 && (
        <div className="text-gray-400">No messages yet</div>
      )}
    </div>
  );
}
