import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_raid",
  title: "Create raid",
  description:
    "Create a raid in a guild the caller leads. Pass an idempotency_key to make retries safe: a repeated call with the same key returns the existing raid instead of creating a duplicate.",
  inputSchema: {
    guild_id: z.string().uuid().describe("Guild to create the raid in. Caller must be a leader."),
    title: z.string().min(2).max(120),
    content: z.string().max(500).default("").describe("Planned content, e.g. 'Heroic clear, bosses 1-8'."),
    starts_at: z.string().datetime({ offset: true }).describe("ISO 8601 start time."),
    ends_at: z.string().datetime({ offset: true }).describe("ISO 8601 end time."),
    time_zone: z.string().max(60).default("UTC").describe("Display time zone, e.g. 'Europe/London'."),
    notes: z.string().max(1000).default(""),
    req_tanks: z.number().int().min(0).max(40).default(2),
    req_healers: z.number().int().min(0).max(40).default(2),
    req_damage: z.number().int().min(0).max(80).default(6),
    idempotency_key: z
      .string()
      .max(120)
      .describe("Unique key for this creation; retries with the same key are safe."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const { data: existing } = await supabase
      .from("raids")
      .select("id, title, starts_at")
      .eq("idempotency_key", input.idempotency_key)
      .maybeSingle();
    if (existing) {
      return {
        content: [{ type: "text", text: `Raid already exists: ${existing.title} (${existing.id})` }],
        structuredContent: { raid: existing, created: false },
      };
    }

    const { data, error } = await supabase
      .from("raids")
      .insert({
        guild_id: input.guild_id,
        title: input.title,
        content: input.content,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        time_zone: input.time_zone,
        notes: input.notes,
        req_tanks: input.req_tanks,
        req_healers: input.req_healers,
        req_damage: input.req_damage,
        idempotency_key: input.idempotency_key,
        created_by: ctx.getUserId(),
      })
      .select("id, title, starts_at, ends_at, time_zone")
      .single();
    if (error) {
      return {
        content: [
          {
            type: "text",
            text: `Could not create raid: ${error.message}. Only guild leaders can create raids.`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `Raid created: ${data.title} (${data.id})` }],
      structuredContent: { raid: data, created: true },
    };
  },
});
