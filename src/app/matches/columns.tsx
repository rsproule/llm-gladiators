"use client";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpDown } from "lucide-react";
import Link from "next/link";

export type Match = {
  id: string;
  match_id: string;
  status: string;
  target_word: string | null;
  winner: string | null;
  winner_reason: string | null;
  total_turns: number;
  started_at: string;
  completed_at: string | null;
  created_by: string | null;
  offense_agent: { name: string } | null;
  defense_agent: { name: string } | null;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

export const columns: ColumnDef<Match>[] = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue<string>("status");
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
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    },
  },
  {
    accessorKey: "match_id",
    header: "Match",
    cell: ({ row }) => (
      <div className="font-mono text-sm">
        {row.getValue<string>("match_id").split("-").slice(-1)[0]}
      </div>
    ),
  },
  {
    id: "offense_agent",
    header: "Offense",
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.offense_agent?.name || "Unknown"}
      </div>
    ),
  },
  {
    id: "defense_agent",
    header: "Defense",
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.defense_agent?.name || "Unknown"}
      </div>
    ),
  },
  {
    accessorKey: "target_word",
    header: "Target Word",
    cell: ({ row }) => {
      const status = row.original.status;
      const targetWord = row.getValue<string>("target_word");

      if (status === "running") {
        return <span className="text-muted-foreground text-sm">Hidden</span>;
      }

      return (
        <code className="bg-muted px-2 py-1 rounded text-sm">
          {targetWord || "—"}
        </code>
      );
    },
  },
  {
    accessorKey: "winner",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Winner
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.original.status;
      if (status === "running") {
        return (
          <span className="text-muted-foreground text-sm">In Progress...</span>
        );
      }

      const winner = row.getValue("winner");
      const reason = row.original.winner_reason;

      if (!winner) {
        return <span className="text-muted-foreground">—</span>;
      }

      const winnerBadge = getWinnerBadge(winner);

      if (reason) {
        return (
          <HoverCard>
            <HoverCardTrigger asChild>
              <div className="cursor-help">{winnerBadge}</div>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Why {winner} won:</h4>
                <p className="text-sm text-muted-foreground">{reason}</p>
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      }

      return winnerBadge;
    },
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => {
      const status = row.original.status;
      if (status === "running") {
        return (
          <span className="text-muted-foreground text-sm">Running...</span>
        );
      }
      return (
        <span className="text-muted-foreground">
          {formatDuration(row.original.started_at, row.original.completed_at)}
        </span>
      );
    },
  },
  {
    accessorKey: "total_turns",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Turns
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("total_turns")}</div>
    ),
  },
  {
    accessorKey: "started_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Started
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatDistanceToNow(new Date(row.original.started_at), {
          addSuffix: true,
        })}
      </span>
    ),
  },
  {
    accessorKey: "completed_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Ended
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.original.status;
      const endDate = row.original.completed_at;
      if (status === "running" || !endDate) {
        return <span className="text-muted-foreground text-sm">—</span>;
      }
      return (
        <span className="text-muted-foreground text-sm">
          {formatDistanceToNow(new Date(endDate), { addSuffix: true })}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Link
        href={`/arena/${row.original.match_id}`}
        className="text-primary hover:text-primary/80 text-sm font-medium"
      >
        View →
      </Link>
    ),
  },
];
