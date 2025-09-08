"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GladiatorSelector } from "./GladiatorSelector";

type Gladiator = {
  id: string;
  name: string;
  system_prompt: string;
  image_url: string | null;
  model: string;
  provider: string;
  is_public: boolean;
  created_at: string;
  echo_user_id: string;
  creator_name?: string;
};

export function StartMatchButton() {
  const [showSelector, setShowSelector] = useState(false);
  const [offenseGladiator, setOffenseGladiator] = useState<Gladiator | null>(
    null,
  );
  const [defenseGladiator, setDefenseGladiator] = useState<Gladiator | null>(
    null,
  );
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const startMatch = async () => {
    if (!offenseGladiator || !defenseGladiator) {
      setError("Please select both offense and defense gladiators");
      return;
    }

    if (offenseGladiator.id === defenseGladiator.id) {
      setError("Please select different gladiators for offense and defense");
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      // Generate a new match ID and navigate to the arena
      const matchId = `match-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      // Start the arena simulation with selected gladiators
      await fetch("/api/arena", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchId,
          offenseGladiatorId: offenseGladiator.id,
          defenseGladiatorId: defenseGladiator.id,
        }),
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

  if (!showSelector) {
    return (
      <button
        onClick={() => setShowSelector(true)}
        className="bg-primary text-primary-foreground py-4 px-8 rounded-lg text-lg font-semibold hover:bg-primary/90 transition-all transform hover:scale-105 shadow-lg"
      >
        Create Match
      </button>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-2xl">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-card border rounded-lg p-6 space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Select Your Gladiators</h3>
          <p className="text-muted-foreground text-sm">
            Choose which AI agents will battle in the arena
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GladiatorSelector
            role="offense"
            selectedId={offenseGladiator?.id || null}
            onSelect={setOffenseGladiator}
            disabled={isStarting}
          />
          <GladiatorSelector
            role="defense"
            selectedId={defenseGladiator?.id || null}
            onSelect={setDefenseGladiator}
            disabled={isStarting}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowSelector(false);
              setOffenseGladiator(null);
              setDefenseGladiator(null);
              setError(null);
            }}
            className="flex-1 bg-secondary text-secondary-foreground py-3 px-4 rounded-lg font-semibold hover:bg-secondary/80 transition-colors"
            disabled={isStarting}
          >
            Back
          </button>
          <button
            onClick={startMatch}
            disabled={isStarting || !offenseGladiator || !defenseGladiator}
            className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStarting ? "Starting Match..." : "Start Battle"}
          </button>
        </div>
      </div>
    </div>
  );
}
