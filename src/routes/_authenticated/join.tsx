import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGuild, joinGuildByInvite } from "@/lib/raid.functions";

export const Route = createFileRoute("/_authenticated/join")({
  head: () => ({
    meta: [
      { title: "Join a guild — Raid Night Planner" },
      { name: "description", content: "Join a guild with an invite code, or found a new one." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [guildName, setGuildName] = useState("");
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await joinGuildByInvite({ data: { inviteCode, displayName } });
      toast.success("Welcome to the guild!");
      navigate({ to: "/raids" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join guild");
    } finally {
      setBusy(false);
    }
  }

  async function found(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createGuild({ data: { name: guildName, displayName } });
      toast.success("Guild founded — you are its leader.");
      navigate({ to: "/raids" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create guild");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-12 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-primary">Join a guild</CardTitle>
          <CardDescription>Enter the invite code your raid leader shared.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={join} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Your display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Spencer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite">Invite code</Label>
              <Input
                id="invite"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="DEMO-RAID"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              Join guild
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-primary">Found a guild</CardTitle>
          <CardDescription>Start a new guild — you become its raid leader.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={found} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guildName">Guild name</Label>
              <Input
                id="guildName"
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                placeholder="The Gilded Gryphon"
                required
              />
            </div>
            <Button type="submit" variant="secondary" className="w-full" disabled={busy || !displayName}>
              Found guild {displayName ? "" : "(set your display name first)"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
