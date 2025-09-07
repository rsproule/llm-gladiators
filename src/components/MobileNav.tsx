"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";
import Link from "next/link";

type MobileNavProps = {
  user: { id: string; email: string } | null;
};

export function MobileNav({ user }: MobileNavProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/gladiators" className="w-full">
            Gladiators
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/matches" className="w-full">
            Matches
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/create" className="w-full">
            Create
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {!user ? (
          <DropdownMenuItem asChild>
            <Link href="/api/echo/signin" className="w-full">
              Sign In
            </Link>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem disabled>
              <div className="flex flex-col">
                <span className="font-medium">{user.email}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <button
                onClick={async () => {
                  try {
                    await fetch("/api/echo/signout", { method: "POST" });
                    window.location.href = "/";
                  } catch (error) {
                    console.error("Sign out failed:", error);
                  }
                }}
                className="w-full text-left"
              >
                Sign Out
              </button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
