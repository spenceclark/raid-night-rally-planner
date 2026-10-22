import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteCharacter, listMyCharacters, saveCharacter } from "@/lib/raid.functions";
import { useGuild } from "@/lib/use-guild";

export const Route = createFileRoute("/_authenticated/characters")({
  head: () => ({
    meta: [
      { title: "My characters — Raid Night Planner" },
      { name: "description", content: "Manage your characters and the roles they can play." },
    ],
  }),
  component: CharactersPage,
});

const ROLES = [
  { value: "tank", label: "Tank" },
  { value: "healer", label: "Healer" },
  { value: "damage", label: "Damage" },
] as const;

function CharactersPage() {
  const { active } = useGuild();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [willing, setWilling] = useState(false);
  const [busy, setBusy] = useState(false);

  const charactersQuery = useQuery({
    queryKey: ["characters", active?.guild_id],
    queryFn: () => listMyCharacters({ data: { guildId: active!.guild_id } }),
    enabled: !!active,
  });

  function toggleRole(role: string) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!active || roles.length === 0) {
      toast.error("Pick at least one role");
      return;
    }
    setBusy(true);
    try {
      await saveCharacter({
        data: {
          guildId: active.guild_id,
          name,
          className,
          roles: roles as Array<"tank" | "healer" | "damage">,
          willingToSwitch: willing,
        },
      });
      setName("");
      setClassName("");
      setRoles([]);
      setWilling(false);
      await queryClient.invalidateQueries({ queryKey: ["characters", active.guild_id] });
      toast.success("Character saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save character");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!active) return;
    await deleteCharacter({ data: { id } });
    await queryClient.invalidateQueries({ queryKey: ["characters", active.guild_id] });
  }

  if (!active) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Join a guild first.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="mb-6 font-display text-2xl font-semibold">My characters</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg text-primary">Add a character</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cname">Name</Label>
                <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cclass">Class (optional)</Label>
                <Input
                  id="cclass"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="flex gap-4">
                  {ROLES.map((r) => (
                    <label key={r.value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={roles.includes(r.value)}
                        onCheckedChange={() => toggleRole(r.value)}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={willing} onCheckedChange={(v) => setWilling(v === true)} />
                Willing to switch roles when needed
              </label>
              <Button type="submit" disabled={busy}>
                Save character
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {(charactersQuery.data ?? []).map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">
                    {c.name}
                    {c.class_name ? <span className="text-muted-foreground"> — {c.class_name}</span> : null}
                  </p>
                  <div className="mt-1 flex gap-1">
                    {c.roles.map((r) => (
                      <Badge key={r} variant="secondary">
                        {r}
                      </Badge>
                    ))}
                    {c.willing_to_switch && <Badge variant="outline">flexible</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
          {(charactersQuery.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No characters yet.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
