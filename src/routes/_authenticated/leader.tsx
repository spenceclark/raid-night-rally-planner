import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createRaid, decideAction, getLeaderDashboard, proposeAction } from "@/lib/raid.functions";
import { useGuild } from "@/lib/use-guild";

export const Route = createFileRoute("/_authenticated/leader")({
  head: () => ({
    meta: [
      { title: "Leader dashboard — Raid Night Planner" },
      { name: "description", content: "Pending alerts, proposed actions and raid management." },
    ],
  }),
  component: LeaderPage,
});

function LeaderPage() {
  const { active, isLeader } = useGuild();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [timeZone, setTimeZone] = useState("UTC");
  const [reqTanks, setReqTanks] = useState(2);
  const [reqHealers, setReqHealers] = useState(2);
  const [reqDamage, setReqDamage] = useState(6);
  const [proposalText, setProposalText] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const dashQuery = useQuery({
    queryKey: ["leader", active?.guild_id],
    queryFn: () => getLeaderDashboard({ data: { guildId: active!.guild_id } }),
    enabled: !!active && isLeader,
  });

  useEffect(() => {
    if (!active) return;
    const channel = supabase
      .channel(`leader-${active.guild_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: `guild_id=eq.${active.guild_id}` },
        () => queryClient.invalidateQueries({ queryKey: ["leader", active.guild_id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [active?.guild_id, queryClient]);

  if (!active) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Join a guild first.</p>
      </AppShell>
    );
  }
  if (!isLeader) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Only guild leaders can view this page.</p>
      </AppShell>
    );
  }

  const dash = dashQuery.data;

  async function submitRaid(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createRaid({
        data: {
          guildId: active!.guild_id,
          title,
          content,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          timeZone,
          reqTanks,
          reqHealers,
          reqDamage,
          idempotencyKey: crypto.randomUUID(),
        },
      });
      setTitle("");
      setContent("");
      await queryClient.invalidateQueries({ queryKey: ["leader", active!.guild_id] });
      await queryClient.invalidateQueries({ queryKey: ["raids", active!.guild_id] });
      toast.success("Raid created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create raid");
    } finally {
      setBusy(false);
    }
  }

  async function decide(actionId: string, decision: "approved" | "rejected") {
    await decideAction({ data: { actionId, decision } });
    await queryClient.invalidateQueries({ queryKey: ["leader", active!.guild_id] });
    toast.success(`Action ${decision}`);
  }

  async function propose(alertId: string, raidId: string) {
    const proposal = proposalText[alertId]?.trim();
    if (!proposal) return;
    await proposeAction({
      data: { guildId: active!.guild_id, raidId, alertId, proposal },
    });
    setProposalText((p) => ({ ...p, [alertId]: "" }));
    await queryClient.invalidateQueries({ queryKey: ["leader", active!.guild_id] });
    toast.success("Proposed action recorded");
  }

  return (
    <AppShell>
      <h1 className="mb-6 font-display text-2xl font-semibold">Leader dashboard</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg text-primary">Pending alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(dash?.alerts ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No alerts. All quiet on the front.</p>
              )}
              {(dash?.alerts ?? []).map((a) => (
                <div key={a.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        a.status === "recorded"
                          ? "destructive"
                          : a.status === "retrieved"
                            ? "secondary"
                            : "default"
                      }
                    >
                      {a.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{a.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.raids?.title} · webhook{" "}
                    {a.webhook_notified_at ? "nudged" : "not nudged"} · id {a.id.slice(0, 8)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="Propose next action…"
                      value={proposalText[a.id] ?? ""}
                      onChange={(e) =>
                        setProposalText((p) => ({ ...p, [a.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => propose(a.id, a.raid_id)}
                      disabled={!proposalText[a.id]?.trim()}
                    >
                      Propose
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg text-primary">Proposed actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(dash?.actions ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No proposed actions yet.</p>
              )}
              {(dash?.actions ?? []).map((p) => (
                <div key={p.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        p.status === "pending"
                          ? "secondary"
                          : p.status === "approved"
                            ? "default"
                            : "destructive"
                      }
                    >
                      {p.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{p.raids?.title}</span>
                  </div>
                  <p className="mt-2 text-sm">{p.proposal}</p>
                  {p.alerts?.message && (
                    <p className="mt-1 text-xs text-muted-foreground">Re: {p.alerts.message}</p>
                  )}
                  {p.status === "pending" && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => decide(p.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => decide(p.id, "rejected")}>
                        Reject
                      </Button>
                    </div>
                  )}
                  {p.status === "approved" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Approved — recorded as a decision only; nothing is marked as sent without a
                      real delivery confirmation.
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg text-primary">Create a raid</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitRaid} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="rtitle">Title</Label>
                  <Input id="rtitle" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rcontent">Planned content</Label>
                  <Input id="rcontent" value={content} onChange={(e) => setContent(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="rstart">Starts</Label>
                    <Input
                      id="rstart"
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rend">Ends</Label>
                    <Input
                      id="rend"
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rtz">Time zone</Label>
                  <Input id="rtz" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="rt">Tanks</Label>
                    <Input
                      id="rt"
                      type="number"
                      min={0}
                      value={reqTanks}
                      onChange={(e) => setReqTanks(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rh">Healers</Label>
                    <Input
                      id="rh"
                      type="number"
                      min={0}
                      value={reqHealers}
                      onChange={(e) => setReqHealers(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rd">Damage</Label>
                    <Input
                      id="rd"
                      type="number"
                      min={0}
                      value={reqDamage}
                      onChange={(e) => setReqDamage(Number(e.target.value))}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={busy}>
                  Create raid
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg text-primary">Roster gaps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(dash?.raids ?? []).map((r) => (
                <div key={r.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium">{r.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {(["tank", "healer", "damage"] as const).map((role) => {
                      const g = r.gaps[role];
                      return (
                        <Badge key={role} variant={g.missing > 0 ? "destructive" : "secondary"}>
                          {role} {g.confirmed}/{g.required}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
