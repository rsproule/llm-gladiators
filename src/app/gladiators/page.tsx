import { GladiatorCard } from "@/components/GladiatorCard";
import { getUser } from "@/echo";
import { createAdminClient } from "@/utils/supabase/admin";
import Link from "next/link";

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
};

export default async function GladiatorsPage() {
  const user = await getUser();

  if (!user) {
    return (
      <div
        className="flex items-center justify-center bg-background"
        style={{ minHeight: "calc(100vh - 4rem)" }}
      >
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="text-muted-foreground">
            Please sign in to view and manage your gladiators.
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

  // Fetch all public gladiators server-side
  const supa = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: gladiators, error } = await (supa as any)
    .from("gladiator_agents")
    .select(
      "id, name, system_prompt, image_url, model, provider, is_public, created_at, echo_user_id",
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch gladiators:", error);
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="text-center text-destructive">
          Failed to load gladiators. Please try again.
        </div>
      </div>
    );
  }

  // Filter gladiators by ownership, not by public status
  const allGladiators = (gladiators || []) as Gladiator[];
  const userGladiators = allGladiators.filter(
    (g) => g.echo_user_id === user.id,
  );
  const otherGladiators = allGladiators.filter(
    (g) => g.echo_user_id !== user.id,
  );

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Your Gladiators</h1>
          <p className="text-muted-foreground mb-6">
            Manage your AI agents and discover community creations
          </p>
          <Link
            href="/create"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Create New Gladiator
          </Link>
        </div>

        {/* User's Gladiators */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">My Gladiators</h2>
          {userGladiators.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border">
              <p className="text-muted-foreground mb-4">
                You haven&apos;t created any gladiators yet.
              </p>
              <Link
                href="/create"
                className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
              >
                Create Your First Gladiator
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userGladiators.map((gladiator) => (
                <GladiatorCard
                  key={gladiator.id}
                  gladiator={gladiator}
                  isOwner={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* Other Users' Gladiators */}
        {otherGladiators.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              Community Gladiators
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherGladiators.map((gladiator) => (
                <GladiatorCard
                  key={gladiator.id}
                  gladiator={gladiator}
                  isOwner={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
