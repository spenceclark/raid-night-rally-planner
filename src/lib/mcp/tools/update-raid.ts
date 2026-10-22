import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_raid",
  title: "Update raid",
  description:
    "Update a raid's schedule, notes, status or role requirements. Caller must lead the raid's guild.",
  inputSchema: {
    raid_id: z.string().uuid(),
    title: z.string().min(2).max(120).optional(),
    content: z.string().max(500).optional(),
    starts_at: z.string().datetime({ offset: true }).optional(),
    ends_at: z.string().datetime({ offset: true }).optional(),
    time_zone: z.string().max(60).optional(),
    notes: z.string().max(1000).optional(),
    req_tanks: z.number().int().min(0).max(40).optional(),
    req_healers: z.number().int().min(0).max(40).optional(),
    req_damage: z.number().int().min(0).max(80).optional(),
    status: z.enum(["planned", "cancelled", "completed"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const patch: Record<string, unknown> = {};
    for (const key of [
      "title",
      "content",
      "starts_at",
      "ends_at",
      "time_zone",
      "notes",
      "req_tanks",
      "req_healers",
      "req_damage",
      "status",
    ] as const) {
      if (input[key] !== undefined) patch[key] = input[key];
    }
    if (Object.keys(patch).length === 0) {
      return { content: [{ type: "text", text: "Nothing to update — pass at least one field." }], isError: true };
    }
    const { data, error } = await supabase
      .from("raids")
      .update(patch)
      .eq("id", input.raid_id)
      .select("id, title, starts_at, ends_at, status")
      .single();
    if (error) {
      return {
        content: [
          { type: "text", text: `Could not update raid: ${error.message}. Only guild leaders can update raids.` },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `Raid updated: ${data.title} (${data.id})` }],
      structuredContent: { raid: data },
    };
  },
});
