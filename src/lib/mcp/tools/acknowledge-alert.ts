import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "acknowledge_alert",
  title: "Acknowledge alert",
  description:
    "Mark an alert as delivered after the bot has actually delivered the message to the raid leader. Only call this after real delivery — it is the durable record that the leader was notified.",
  inputSchema: {
    alert_id: z.string().uuid().describe("Alert to acknowledge. Caller must lead its guild."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ alert_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("alerts")
      .update({ status: "delivered" })
      .eq("id", alert_id)
      .in("status", ["recorded", "retrieved"])
      .select("id, status")
      .maybeSingle();
    if (error) {
      return {
        content: [{ type: "text", text: `Could not acknowledge alert: ${error.message}. Only guild leaders can acknowledge.` }],
        isError: true,
      };
    }
    if (!data) {
      return {
        content: [{ type: "text", text: "Alert not found or already delivered." }],
        structuredContent: { acknowledged: false },
      };
    }
    return {
      content: [{ type: "text", text: `Alert ${alert_id} marked delivered.` }],
      structuredContent: { acknowledged: true, alert: data },
    };
  },
});
