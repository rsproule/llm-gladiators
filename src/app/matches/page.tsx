import { createAdminClient } from "@/utils/supabase/admin";
import Link from "next/link";
import { columns, type Match } from "./columns";
import { DataTable } from "./data-table";

export default async function MatchesPage() {
  // Fetch all matches (running and completed) with agent names
  const supa = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: matches, error } = await (supa as any)
    .from("matches")
    .select(
      `
      id,
      match_id,
      status,
      target_word,
      winner,
      winner_reason,
      total_turns,
      started_at,
      completed_at,
      created_by,
      offense_agent:offense_agent_id(name),
      defense_agent:defense_agent_id(name)
    `,
    )
    .in("status", ["running", "completed"])
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch matches:", error);
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <div className="text-center text-destructive">
          Failed to load matches. Please try again.
        </div>
      </div>
    );
  }

  // Calculate statistics for completed matches
  const allMatches = (matches || []) as Match[];
  const completedMatches = allMatches.filter((m) => m.status === "completed");
  const totalCompleted = completedMatches.length;
  const offenseWins = completedMatches.filter(
    (m) => m.winner === "offense",
  ).length;
  const defenseWins = completedMatches.filter(
    (m) => m.winner === "defense",
  ).length;
  const ties = completedMatches.filter((m) => m.winner === "tie").length;

  const offenseWinRate =
    totalCompleted > 0
      ? ((offenseWins / totalCompleted) * 100).toFixed(1)
      : "0";
  const defenseWinRate =
    totalCompleted > 0
      ? ((defenseWins / totalCompleted) * 100).toFixed(1)
      : "0";
  const tieRate =
    totalCompleted > 0 ? ((ties / totalCompleted) * 100).toFixed(1) : "0";

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Match History</h1>
            <p className="text-muted-foreground mt-2">
              Browse ongoing and completed battles between AI gladiators
            </p>
          </div>
          <Link
            href="/"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Start New Match
          </Link>
        </div>

        {/* Match Statistics */}
        {totalCompleted > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg border p-4">
              <div className="text-2xl font-bold">{totalCompleted}</div>
              <div className="text-sm text-muted-foreground">Total Matches</div>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <div className="text-2xl font-bold text-green-600">
                {offenseWinRate}%
              </div>
              <div className="text-sm text-muted-foreground">Offense Wins</div>
              <div className="text-xs text-muted-foreground">
                {offenseWins} matches
              </div>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <div className="text-2xl font-bold text-blue-600">
                {defenseWinRate}%
              </div>
              <div className="text-sm text-muted-foreground">Defense Wins</div>
              <div className="text-xs text-muted-foreground">
                {defenseWins} matches
              </div>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <div className="text-2xl font-bold text-gray-600">{tieRate}%</div>
              <div className="text-sm text-muted-foreground">Ties</div>
              <div className="text-xs text-muted-foreground">
                {ties} matches
              </div>
            </div>
          </div>
        )}

        <DataTable columns={columns} data={allMatches} />
      </div>
    </div>
  );
}
