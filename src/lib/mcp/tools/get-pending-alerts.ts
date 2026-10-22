import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_pending_alerts",
  title: "Get pending alerts",
  description:
    "Poll the durable alert queue for a guild the caller leads. Returns alerts in 'recorded' status and marks them 'retrieved' — retrieval is not delivery to the raid leader. Acknowledge handled alerts with acknowledge_alert.",
  inputSchema: {
    guild_id: z.string().uuid().describe("Guild to poll alerts for. Caller must be a leader."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ guild_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("alerts")
      .select("id, raid_id, kind, message, dedupe_key, status, created_at")
      .eq("guild_id", guild_id)
      .eq("status", "recorded")
      .order("created_at")
      .limit(50);
    if (error) {
      return {
        content: [{ type: "text", text: `Could not read alerts: ${error.message}. Only guild leaders can poll alerts.` }],
        isError: true,
      };
    }
    const alerts = data ?? [];
    if (alerts.length > 0) {
      await supabase
        .from("alerts")
        .update({ status: "retrieved" })
        .in("id", alerts.map((a) => a.id))
        .eq("status", "recorded");
    }
    return {
      content: [{ type: "text", text: JSON.stringify(alerts) }],
      structuredContent: { alerts },
    };
  },
});
