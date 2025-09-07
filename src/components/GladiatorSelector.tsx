"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

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

type GladiatorSelectorProps = {
  role: "offense" | "defense";
  selectedId: string | null;
  onSelect: (gladiator: Gladiator) => void;
  disabled?: boolean;
};

export function GladiatorSelector({
  role,
  selectedId,
  onSelect,
  disabled,
}: GladiatorSelectorProps) {
  const [gladiators, setGladiators] = useState<Gladiator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGladiators = async () => {
      try {
        const response = await fetch("/api/gladiators?includePublic=true");
        if (response.ok) {
          const result = await response.json();
          setGladiators(result.gladiators || []);
        }
      } catch (err) {
        console.error("Failed to fetch gladiators:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGladiators();
  }, []);

  const selectedGladiator = gladiators.find((g) => g.id === selectedId);
  const roleEmoji = role === "offense" ? "⚔️" : "🛡️";
  const roleColor = role === "offense" ? "text-green-600" : "text-blue-600";

  if (isLoading) {
    return (
      <div className="p-4 border border-border rounded-lg bg-card">
        <div className="text-sm text-muted-foreground">
          Loading gladiators...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className={`text-sm font-medium ${roleColor}`}>
        {roleEmoji} {role.charAt(0).toUpperCase() + role.slice(1)} Gladiator
      </label>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-auto p-4"
            disabled={disabled}
          >
            {selectedGladiator ? (
              <div className="flex items-center gap-3 text-left">
                {selectedGladiator.image_url ? (
                  <img
                    src={selectedGladiator.image_url}
                    alt={selectedGladiator.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-semibold">
                      {selectedGladiator.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <div className="font-medium">{selectedGladiator.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedGladiator.model} •{" "}
                    {selectedGladiator.system_prompt.slice(0, 50)}...
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">
                Select a gladiator...
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 max-h-80 overflow-y-auto">
          {gladiators.map((gladiator) => (
            <DropdownMenuItem
              key={gladiator.id}
              onClick={() => onSelect(gladiator)}
              className="p-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 w-full">
                {gladiator.image_url ? (
                  <img
                    src={gladiator.image_url}
                    alt={gladiator.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-semibold">
                      {gladiator.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{gladiator.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {gladiator.system_prompt.slice(0, 60)}...
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {gladiator.model} •{" "}
                    {gladiator.is_public ? "Public" : "Private"}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
