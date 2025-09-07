import { StartMatchButton } from "@/components/StartMatchButton";
import { getUser } from "@/echo";

export default async function HomePage() {
  const user = await getUser();

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
          </div>

          <div className="space-y-6">
            <StartMatchButton isSignedIn={!!user} />
          </div>
        </div>
      </div>
    </div>
  );
}
