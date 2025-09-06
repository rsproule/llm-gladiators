"use client";
import type { SubStatus } from "@/hooks/useMatchStream";

export function StatusDot({ status }: { status: SubStatus }) {
  const cls =
    status === "listening"
      ? "h-2 w-2 rounded-full bg-green-500 animate-pulse"
      : status === "connecting"
      ? "h-2 w-2 rounded-full bg-yellow-500 animate-pulse"
      : "h-2 w-2 rounded-full bg-gray-400";
  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
      <span className={cls} />
      <span>
        {status === "listening"
          ? "Listening"
          : status === "connecting"
          ? "Connecting..."
          : "Disconnected"}
      </span>
    </div>
  );
}
