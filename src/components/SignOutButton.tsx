"use client";

export function SignOutButton() {
  const signOut = async () => {
    try {
      await fetch("/api/echo/signout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <button
      onClick={signOut}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      Sign Out
    </button>
  );
}
