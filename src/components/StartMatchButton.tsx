"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type StartMatchButtonProps = {
  isSignedIn: boolean;
};

export function StartMatchButton({ isSignedIn }: StartMatchButtonProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const signIn = () => {
    window.location.href = "/api/echo/signin";
  };

  const startMatch = async () => {
    if (!isSignedIn) {
      setError("Please sign in first");
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      // Generate a new match ID and navigate to the arena
      const matchId = `match-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      // Start the arena simulation
      await fetch("/api/arena", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId }),
      });

      // Navigate to the arena page
      router.push(`/arena/${matchId}`);
    } catch (err) {
      console.error("Start match error:", err);
      setError("Failed to start match. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <>
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-4 rounded-lg">
          {error}
        </div>
      )}

      {isSignedIn ? (
        <button
          onClick={startMatch}
          disabled={isStarting}
          className="bg-primary text-primary-foreground py-4 px-8 rounded-lg text-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
        >
          {isStarting ? "Starting Match..." : "Start Match"}
        </button>
      ) : (
        <button
          onClick={signIn}
          className="bg-primary text-primary-foreground py-4 px-8 rounded-lg text-lg font-semibold hover:bg-primary/90 transition-all transform hover:scale-105 shadow-lg"
        >
          Sign In to Play
        </button>
      )}
    </>
  );
}
