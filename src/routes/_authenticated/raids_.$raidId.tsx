import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  cancelSignup,
  claimDemoParticipant,
  getRaidDetail,
  resetReadyCheckDemo,
  upsertSignup,
} from "@/lib/raid.functions";

export const Route = createFileRoute("/_authenticated/raids_/$raidId")({
  head: () => ({
    meta: [
      { title: "Raid detail — Raid Night Planner" },
      { name: "description", content: "Raid schedule, signup controls, roster and role gaps." },
    ],
  }),
  component: RaidDetailPage,
});

type Status = "confirmed" | "tentative" | "unavailable" | "standby" | "no_response";
type Role = "tank" | "healer" | "damage";

const STATUS_LABELS: Record<Status, string> = {
  confirmed: "Confirmed",
  tentative: "Tentative",
  unavailable: "Unavailable",
  standby: "Standby",
  no_response: "No response",
};

const SIGNUP_CHOICES: Status[] = ["confirmed", "tentative", "unavailable", "standby"];

function fmtTime(iso: string | null, tz: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
}

function GapBadge({ label, gap }: { label: string; gap: { required: number; confirmed: number; missing: number } }) {
  return (
    <Badge variant={gap.missing > 0 ? "destructive" : "secondary"}>
      {label}: {gap.confirmed}/{gap.required}
      {gap.missing > 0 ? ` — ${gap.missing} missing` : ""}
    </Badge>
  );
}

function RaidDetailPage() {
  const { raidId } = Route.useParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("confirmed");
  const [role, setRole] = useState<Role>("damage");
  const [characterId, setCharacterId] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [claimCharacterId, setClaimCharacterId] = useState("");

  const detailQuery = useQuery({
    queryKey: ["raid", raidId],
    queryFn: () => getRaidDetail({ data: { raidId } }),
  });

  // Realtime: refresh when signups or alerts change.
  useEffect(() => {
    const channel = supabase
      .channel(`raid-${raidId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "signups", filter: `raid_id=eq.${raidId}` },
        () => queryClient.invalidateQueries({ queryKey: ["raid", raidId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: `raid_id=eq.${raidId}` },
        () => queryClient.invalidateQueries({ queryKey: ["raid", raidId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [raidId, queryClient]);

  const detail = detailQuery.data;

  useEffect(() => {
    if (detail?.mySignup) {
      setStatus(detail.mySignup.status as Status);
      setRole(detail.mySignup.role as Role);
      setCharacterId(detail.mySignup.character_id ?? "");
      setNote(detail.mySignup.note ?? "");
    }
  }, [detail?.mySignup?.id]);

  if (!detail) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Loading raid…</p>
      </AppShell>
    );
  }

  const { raid, signups, myCharacters, mySignup, gaps } = detail;
  const standbyConfirmed = signups.filter((s) => s.status === "standby");
  const confirmedCount = signups.filter((s) => s.status === "confirmed").length;
  const requiredTotal = raid.req_tanks + raid.req_healers + raid.req_damage;
  const isReadyCheckDemo = raid.idempotency_key === "seed:ready-check:citadel";
  const alexRow = signups.find((s) => s.seed_key === "alex");
  const isLeader = detail.isLeader;

  async function resetDemo() {
    if (!confirm("Reset the demo scenario? This restores the seeded roster and clears its alerts and decisions.")) return;
    setBusy(true);
    try {
      await resetReadyCheckDemo();
      await queryClient.invalidateQueries({ queryKey: ["raid", raidId] });
      toast.success("Demo scenario reset");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset demo");
    } finally {
      setBusy(false);
    }
  }

  async function claimAlex() {
    if (!claimCharacterId) return;
    setBusy(true);
    try {
      await claimDemoParticipant({ data: { raidId, seedKey: "alex", characterId: claimCharacterId } });
      await queryClient.invalidateQueries({ queryKey: ["raid", raidId] });
      toast.success("You are now playing Alex's confirmed healer spot");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not map character");
    } finally {
      setBusy(false);
    }
  }

  async function saveSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await upsertSignup({
        data: { raidId, characterId: characterId || null, role, status, note },
      });
      await queryClient.invalidateQueries({ queryKey: ["raid", raidId] });
      toast.success("Signup saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save signup");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!mySignup) return;
    setBusy(true);
    try {
      await cancelSignup({ data: { signupId: mySignup.id, raidId } });
      await queryClient.invalidateQueries({ queryKey: ["raid", raidId] });
      toast.success("Signup cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">{raid.title}</h1>
        <p className="mt-1 text-muted-foreground">{raid.content}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {new Date(raid.starts_at).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
          {" — "}
          {new Date(raid.ends_at).toLocaleString(undefined, { timeStyle: "short" })} · Times shown in{" "}
          <span className="text-foreground">{raid.time_zone}</span>
        </p>
        {raid.notes && <p className="mt-2 text-sm italic text-muted-foreground">{raid.notes}</p>}
        {raid.invites_at && (
          <p className="mt-1 text-sm text-muted-foreground">Invites from {fmtTime(raid.invites_at, raid.time_zone)}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant={confirmedCount < requiredTotal ? "destructive" : "secondary"}>
            Confirmed: {confirmedCount}/{requiredTotal}
          </Badge>
          <Badge variant="outline">Reserves: {standbyConfirmed.length}</Badge>
          <GapBadge label="Tanks" gap={gaps.tank} />
          <GapBadge label="Healers" gap={gaps.healer} />
          <GapBadge label="Damage" gap={gaps.damage} />
        </div>
      </div>

      {isReadyCheckDemo && (
        <Card className="mb-6 border-primary/40">
          <CardHeader>
            <CardTitle className="font-display text-lg text-primary">Demo scenario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {alexRow?.is_mine ? (
              <p>You are playing <strong>Alex</strong> (confirmed healer). Cancel your signup to trigger the healer-gap demo.</p>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor="claim">Play Alex's confirmed healer spot as</Label>
                  <select
                    id="claim"
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={claimCharacterId}
                    onChange={(e) => setClaimCharacterId(e.target.value)}
                  >
                    <option value="">— choose your character —</option>
                    {myCharacters.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={claimAlex} disabled={busy || !claimCharacterId}>Map to Alex</Button>
                {myCharacters.length === 0 && (
                  <p className="text-muted-foreground">Create a character first on My characters.</p>
                )}
              </div>
            )}
            {isLeader && (
              <Button variant="outline" onClick={resetDemo} disabled={busy}>Reset demo scenario</Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg text-primary">Your signup</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="character">Character</Label>
                <select
                  id="character"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={characterId}
                  onChange={(e) => setCharacterId(e.target.value)}
                >
                  <option value="">— choose —</option>
                  {myCharacters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.class_name ? ` (${c.class_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  <option value="tank">Tank</option>
                  <option value="healer">Healer</option>
                  <option value="damage">Damage</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                >
                  {SIGNUP_CHOICES.map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  {mySignup ? "Update signup" : "Sign up"}
                </Button>
                {mySignup && (
                  <Button type="button" variant="destructive" onClick={cancel} disabled={busy}>
                    Cancel signup
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg text-primary">Roster</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {signups.length === 0 && <p className="text-sm text-muted-foreground">No signups yet.</p>}
            {signups.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span>
                  {s.display_name}
                  {s.characters?.name || s.character_name ? (
                    <span className="text-muted-foreground">
                      {" "}— {s.characters?.name ?? s.character_name}
                      {s.class_name ? ` (${s.class_name})` : ""}
                    </span>
                  ) : null}
                  {s.is_mine && <span className="text-primary"> · you</span>}
                </span>
                <span className="flex gap-1">
                  <Badge variant="outline">{s.role}</Badge>
                  <Badge
                    variant={
                      s.status === "confirmed"
                        ? "default"
                        : s.status === "unavailable"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {STATUS_LABELS[s.status as Status]}
                  </Badge>
                </span>
              </div>
            ))}
            {standbyConfirmed.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Standby — possible replacements (not auto-confirmed)
                </p>
                {standbyConfirmed.map((s) => (
                  <p key={s.id} className="text-sm">
                    {s.display_name} <span className="text-muted-foreground">({s.role})</span>
                    {s.availability_start && (
                      <span className="text-muted-foreground">
                        {" "}· {fmtTime(s.availability_start, raid.time_zone)}–{fmtTime(s.availability_end, raid.time_zone)}
                      </span>
                    )}
                    {s.availability_note && <span className="block text-xs text-muted-foreground">{s.availability_note}</span>}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
