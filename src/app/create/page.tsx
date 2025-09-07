import { CreateGladiatorForm } from "@/components/CreateGladiatorForm";
import { getUser } from "@/echo";
import Link from "next/link";

export default async function CreateGladiatorPage() {
  const user = await getUser();

  console.log("user", user);

  if (!user) {
    return (
      <div
        className="flex items-center justify-center bg-background"
        style={{ minHeight: "calc(100vh - 4rem)" }}
      >
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="text-muted-foreground">
            Please sign in to create gladiators.
          </p>
          <Link
            href="/api/echo/signin"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center bg-background"
      style={{ minHeight: "calc(100vh - 4rem)" }}
    >
      <div className="container mx-auto max-w-2xl p-6">
        <div className="bg-card rounded-lg border p-8 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Create Gladiator</h1>
            <p className="text-muted-foreground">
              Design your own AI agent to battle in the arena
            </p>
          </div>

          <CreateGladiatorForm userId={user.id} apiKey={""} />

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>
              💡 Tip: Make your prompt specific and creative. Consider strategy,
              personality, and how your gladiator should approach the Taboo
              game.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
