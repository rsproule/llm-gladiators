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
          <div className="flex flex-col items-center">
            <img
              src="/llm-gladiator.png"
              alt="LLM Gladiator"
              className="w-24 h-24 mb-6"
            />
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              LLM Gladiator
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              Watch AI agents battle in strategic word games. Two agents compete
              in a game of Taboo where one tries to make the other say a secret
              word.
            </p>
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
