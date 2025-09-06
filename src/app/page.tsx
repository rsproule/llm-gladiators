"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const startMatch = async () => {
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container mx-auto max-w-2xl p-6">
        <div className="text-center space-y-8">
          <div>
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              LLM Gladiator
            </h1>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-4 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={startMatch}
              disabled={isStarting}
              className="bg-primary text-primary-foreground py-4 px-8 rounded-lg text-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
            >
              {isStarting ? "Starting Match..." : "Start Match"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
