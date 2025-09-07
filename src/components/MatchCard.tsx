"use client";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { type Match } from "@/app/matches/columns";

type MatchCardProps = {
  match: Match;
};

const formatDuration = (startDate: string, endDate: string | null) => {
  if (!endDate) return "—";
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  
  if (diffSeconds < 60) return `${diffSeconds}s`;
  if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    const secs = diffSeconds % 60;
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(diffSeconds / 3600);
  const mins = Math.floor((diffSeconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

const getWinnerBadge = (winner: string | null) => {
  if (!winner) return <span className="text-muted-foreground">—</span>;
  
  const colors = {
    offense: "bg-green-500/10 text-green-500 border-green-500/20",
    defense: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    tie: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium border ${
        colors[winner as keyof typeof colors] || colors.tie
      }`}
    >
      {winner.charAt(0).toUpperCase() + winner.slice(1)}
    </span>
  );
};

const getStatusBadge = (status: string) => {
  const colors = {
    running: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    completed: "bg-green-500/10 text-green-600 border-green-500/20",
    error: "bg-red-500/10 text-red-600 border-red-500/20",
  };
  
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium border ${
        colors[status as keyof typeof colors] || colors.error
      }`}
    >
      {status === "running" && "🔄 "}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export function MatchCard({ match }: MatchCardProps) {
  return (
    <div className="bg-card rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-sm text-muted-foreground">
          {match.match_id.split("-").slice(-1)[0]}
        </div>
        {getStatusBadge(match.status)}
      </div>

      <div className="space-y-2">
        <div className="text-sm">
          <span className="font-medium text-green-600">Offense:</span>{" "}
          {match.offense_agent?.name || "Unknown"}
        </div>
        <div className="text-sm">
          <span className="font-medium text-blue-600">Defense:</span>{" "}
          {match.defense_agent?.name || "Unknown"}
        </div>
      </div>

      {match.target_word && match.status === "completed" && (
        <div className="text-sm">
          <span className="font-medium">Target:</span>{" "}
          <code className="bg-muted px-1 py-0.5 rounded text-xs">
            {match.target_word}
          </code>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="space-y-1">
          {match.status === "running" ? (
            <span className="text-muted-foreground">In Progress...</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium">Winner:</span>
              {getWinnerBadge(match.winner)}
            </div>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground space-y-1">
          <div>
            {formatDistanceToNow(new Date(match.started_at), { addSuffix: true })}
          </div>
          {match.status === "completed" && (
            <div>
              Duration: {formatDuration(match.started_at, match.completed_at)}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground">
          {match.total_turns} turns
        </div>
        <Link
          href={`/arena/${match.match_id}`}
          className="text-primary hover:text-primary/80 text-sm font-medium"
        >
          View Match →
        </Link>
      </div>
    </div>
  );
}
