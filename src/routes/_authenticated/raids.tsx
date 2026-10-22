import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listRaids } from "@/lib/raid.functions";
import { useGuild } from "@/lib/use-guild";

export const Route = createFileRoute("/_authenticated/raids")({
  head: () => ({
    meta: [
      { title: "Upcoming raids — Raid Night Planner" },
      { name: "description", content: "Your guild's upcoming raids and signups." },
    ],
  }),
  component: RaidsPage,
});

function formatWhen(startsAt: string, timeZone: string) {
  const d = new Date(startsAt);
  return `${d.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })} (${timeZone})`;
}

function RaidsPage() {
  const { active, isLoading } = useGuild();
  const raidsQuery = useQuery({
    queryKey: ["raids", active?.guild_id],
    queryFn: () => listRaids({ data: { guildId: active!.guild_id } }),
    enabled: !!active,
  });

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!active) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-lg text-center">
          <CardHeader>
            <CardTitle className="font-display text-primary">No guild yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Join your guild with an invite code, or found a new one.
            </p>
            <Button asChild>
              <Link to="/join">Join or found a guild</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const raids = raidsQuery.data ?? [];

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Upcoming raids — {active.guilds?.name}
        </h1>
        {active.guilds?.is_demo && <Badge variant="secondary">Demo guild</Badge>}
      </div>
      {raids.length === 0 ? (
        <p className="text-muted-foreground">
          No raids scheduled. Your raid leader creates raids through Grok Bot or the leader
          dashboard.
        </p>
      ) : (
        <div className="grid gap-4">
          {raids.map((raid) => (
            <Link key={raid.id} to="/raids/$raidId" params={{ raidId: raid.id }}>
              <Card className="transition-colors hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="font-display text-lg">{raid.title}</CardTitle>
                    <Badge variant={raid.status === "planned" ? "default" : "secondary"}>
                      {raid.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>{raid.content}</p>
                  <p>{formatWhen(raid.starts_at, raid.time_zone)}</p>
                  <p>
                    Needs {raid.req_tanks} tanks · {raid.req_healers} healers · {raid.req_damage}{" "}
                    damage
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
