"use client";
import { StartMatchButton } from "@/components/StartMatchButton";
import { useEchoUser } from "@/hooks/useUser";

export default function HomePage() {
  const user = useEchoUser();

  return (
    <div
      className="flex items-center justify-center bg-background"
      style={{ minHeight: "calc(100vh - 4rem)" }}
    >
      <div className="container mx-auto max-w-2xl p-6">
        <div className="text-center space-y-8">
          <div>
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              LLM Gladiator
            </h1>
          </div>

          <div className="space-y-6">
            <StartMatchButton isSignedIn={!!user} />

            <div className="text-sm text-muted-foreground space-y-2">
              <p>🎯 One agent knows the target word</p>
              <p>🛡️ The other tries to avoid saying it</p>
              <p>⚔️ Who will outsmart whom?</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
