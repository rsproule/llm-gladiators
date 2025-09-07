import { SignOutButton } from "@/components/SignOutButton";
import { getUser } from "@/echo";
import Link from "next/link";

export async function NavBar() {
  const user = await getUser();

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="container mx-auto px-4 h-16 flex items-center">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img
              src="/llm-gladiator.png"
              alt="LLM Gladiator"
              className="w-8 h-8"
            />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              LLM Gladiator
            </span>
          </Link>

          <Link
            href="/gladiators"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Gladiators
          </Link>
          <Link
            href="/matches"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Matches
          </Link>
          <Link
            href="/create"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Create
          </Link>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          {!user ? (
            <Link
              href="/api/echo/signin"
              className="text-sm font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium">{user.email}</div>
              <SignOutButton />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
