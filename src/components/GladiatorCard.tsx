"use client";
import { useState } from "react";

type Gladiator = {
  id: string;
  echo_user_id: string;
  name: string;
  system_prompt: string;
  image_url: string | null;
  model: string;
  provider: string;
  is_public: boolean;
  created_at: string;
  creator_name?: string;
};

type GladiatorCardProps = {
  gladiator: Gladiator;
  isOwner: boolean;
};

export function GladiatorCard({ gladiator, isOwner }: GladiatorCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${gladiator.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/gladiators/${gladiator.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh the page to show updated list
        window.location.reload();
      } else {
        alert("Failed to delete gladiator");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete gladiator");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="bg-card rounded-lg border p-6 space-y-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {gladiator.image_url ? (
            <img
              src={gladiator.image_url}
              alt={gladiator.name}
              className="w-12 h-12 rounded-full object-cover border border-border"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border">
              <span className="text-lg font-semibold text-muted-foreground">
                {gladiator.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-lg">{gladiator.name}</h3>
            <p className="text-sm text-muted-foreground">
              {gladiator.model} • {formatDate(gladiator.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {gladiator.is_public && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              Public
            </span>
          )}
          {isOwner && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs text-destructive hover:text-destructive/80 disabled:opacity-50"
            >
              {isDeleting ? "..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium text-sm">System Prompt</h4>
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {gladiator.system_prompt}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground">
          Provider: {gladiator.provider}
        </div>
        <button className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:bg-secondary/80 transition-colors">
          Use in Battle
        </button>
      </div>
    </div>
  );
}
