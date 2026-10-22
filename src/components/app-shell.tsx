import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useGuild } from "@/lib/use-guild";

export function AppShell({ children }: { children: ReactNode }) {
  const { memberships, active, select, isLeader } = useGuild();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/raids" className="font-display text-lg font-semibold text-primary">
            Raid Night
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Button asChild variant="ghost" size="sm">
              <Link to="/raids">Raids</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/characters">My characters</Link>
            </Button>
            {isLeader && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/leader">Leader</Link>
              </Button>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {memberships.length > 1 && (
              <select
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                value={active?.guild_id ?? ""}
                onChange={(e) => select(e.target.value)}
                aria-label="Active guild"
              >
                {memberships.map((m) => (
                  <option key={m.guild_id} value={m.guild_id}>
                    {m.guilds?.name ?? "Guild"}
                  </option>
                ))}
              </select>
            )}
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {active?.display_name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth", search: { next: undefined } });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
