import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { computeRoleGaps } from "../../raid-core.server";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_raid_status",
  title: "Get raid status",
  description:
    "Get a raid's confirmed roster counts, role gaps and standby members. Only confirmed signups count toward requirements.",
  inputSchema: {
    raid_id: z.string().uuid().describe("Raid to inspect. Caller must be a member of its guild."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ raid_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: raid, error } = await supabase
      .from("raids")
      .select("id, guild_id, title, starts_at, ends_at, invites_at, time_zone, status, notes, req_tanks, req_healers, req_damage")
      .eq("id", raid_id)
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const [{ data: signups, error: sErr }, { data: members }] = await Promise.all([
      supabase
        .from("signups")
        .select(
          "user_id, role, status, note, player_name, character_name, class_name, availability_start, availability_end, availability_note, contact_ok, switch_offers, switch_note, characters(name, class_name)",
        )
        .eq("raid_id", raid_id),
      supabase.from("memberships").select("user_id, display_name").eq("guild_id", raid.guild_id),
    ]);
    if (sErr) return { content: [{ type: "text", text: sErr.message }], isError: true };

    const memberName = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));
    const rows = signups ?? [];
    const computed = computeRoleGaps(raid, rows);
    // Anonymous object literals: named interfaces fail the MCP JSON type.
    const gaps = {
      tank: { ...computed.tank },
      healer: { ...computed.healer },
      damage: { ...computed.damage },
    };
    const startMs = new Date(raid.starts_at).getTime();
    const endMs = new Date(raid.ends_at).getTime();

    // Facts only — no recommendation is computed here.
    const participants = rows.map((s) => {
      const aStart = s.availability_start;
      const aEnd = s.availability_end;
      return {
        player: s.player_name ?? (s.user_id ? memberName.get(s.user_id) ?? "Member" : "Unknown"),
        character: s.characters?.name ?? s.character_name ?? null,
        class_name: s.characters?.class_name ?? s.class_name ?? null,
        role: s.role,
        response_status: s.status,
        counts_toward_roster: s.status === "confirmed",
        availability_start: aStart,
        availability_end: aEnd,
        covers_raid_start: aStart ? new Date(aStart).getTime() <= startMs : null,
        covers_raid_end: aEnd ? new Date(aEnd).getTime() >= endMs : null,
        availability_note: s.availability_note,
        willing_to_be_contacted: s.contact_ok,
        offered_role_switches: [...(s.switch_offers ?? [])],
        switch_note: s.switch_note,
        note: s.note,
      };
    });
    const confirmed = rows.filter((s) => s.status === "confirmed").length;

    const status = {
      raid_id: raid.id,
      title: raid.title,
      starts_at: raid.starts_at,
      ends_at: raid.ends_at,
      invites_at: raid.invites_at,
      time_zone: raid.time_zone,
      status: raid.status,
      notes: raid.notes,
      confirmed_total: confirmed,
      required_total: raid.req_tanks + raid.req_healers + raid.req_damage,
      gaps,
      standby_count: rows.filter((s) => s.status === "standby").length,
      tentative_count: rows.filter((s) => s.status === "tentative").length,
      policy:
        "Only confirmed signups count. Standby players must accept a promotion; nothing is auto-promoted. A role switch requires the player's explicit offer, and switching a confirmed player away from a role opens a vacancy in that role. Class capability alone is not permission to switch.",
      participants,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(status) }],
      structuredContent: { status },
    };
  },
});
