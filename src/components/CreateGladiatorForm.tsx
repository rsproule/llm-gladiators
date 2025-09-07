"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CreateGladiatorFormProps = {
  userId: string;
  apiKey: string;
};

export function CreateGladiatorForm({
  userId,
  apiKey,
}: CreateGladiatorFormProps) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter a name for your gladiator");
      return;
    }

    if (!prompt.trim()) {
      setError("Please enter a system prompt for your gladiator");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/gladiators", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          systemPrompt: prompt.trim(),
          imageUrl: image.trim() || null,
          model: "gpt-4o",
          provider: "openai",
          isPublic: false,
          apiKey: apiKey,
          userId: userId,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        setError(result.error || "Failed to create gladiator");
        return;
      }

      // Navigate back to gladiators page
      router.push("/gladiators");
    } catch (err) {
      console.error("Create gladiator error:", err);
      setError("Failed to create gladiator. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Gladiator Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a unique name for your gladiator..."
          className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          maxLength={50}
        />
      </div>

      <div>
        <label htmlFor="prompt" className="block text-sm font-medium mb-2">
          System Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Define your gladiator's personality, strategy, and behavior..."
          className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-32 resize-y"
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {prompt.length}/2000 characters
        </p>
      </div>

      <div>
        <label htmlFor="image" className="block text-sm font-medium mb-2">
          Avatar Image URL (Optional)
        </label>
        <input
          id="image"
          type="url"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
          className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        {image && (
          <div className="mt-2">
            <img
              src={image}
              alt="Avatar preview"
              className="w-16 h-16 rounded-full object-cover border border-border"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex-1 bg-secondary text-secondary-foreground py-3 px-4 rounded-md font-semibold hover:bg-secondary/80 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={isCreating || !name.trim() || !prompt.trim()}
          className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? "Creating..." : "Create Gladiator"}
        </button>
      </div>
    </div>
  );
}
