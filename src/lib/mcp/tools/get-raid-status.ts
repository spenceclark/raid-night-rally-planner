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
      .select("id, guild_id, title, starts_at, ends_at, time_zone, status, req_tanks, req_healers, req_damage")
      .eq("id", raid_id)
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const { data: signups, error: sErr } = await supabase
      .from("signups")
      .select("role, status")
      .eq("raid_id", raid_id);
    if (sErr) return { content: [{ type: "text", text: sErr.message }], isError: true };

    const rows = (signups ?? []) as Array<{
      role: "tank" | "healer" | "damage";
      status: "confirmed" | "tentative" | "unavailable" | "standby";
    }>;
    const gaps = computeRoleGaps(raid, rows);
    const standby = rows.filter((s) => s.status === "standby").length;
    const tentative = rows.filter((s) => s.status === "tentative").length;

    const status = {
      raid_id: raid.id,
      title: raid.title,
      starts_at: raid.starts_at,
      ends_at: raid.ends_at,
      time_zone: raid.time_zone,
      status: raid.status,
      gaps,
      standby_count: standby,
      tentative_count: tentative,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(status) }],
      structuredContent: { status },
    };
  },
});
