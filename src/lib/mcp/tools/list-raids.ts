import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_raids",
  title: "List raids",
  description: "List upcoming raids for a guild the caller belongs to.",
  inputSchema: {
    guild_id: z.string().uuid().describe("Guild to list raids for. Caller must be a member."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ guild_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("raids")
      .select("id, title, content, starts_at, ends_at, time_zone, status, req_tanks, req_healers, req_damage")
      .eq("guild_id", guild_id)
      .gte("ends_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .order("starts_at")
      .limit(50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const raids = (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      starts_at: r.starts_at,
      ends_at: r.ends_at,
      time_zone: r.time_zone,
      status: r.status,
      requirements: { tanks: r.req_tanks, healers: r.req_healers, damage: r.req_damage },
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(raids) }],
      structuredContent: { raids },
    };
  },
});
