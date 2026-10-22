import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "record_leader_decision",
  title: "Record leader decision",
  description:
    "Record the raid leader's decision on a proposed action (approve or reject). This records the decision only — approving a draft does not mark any message as sent.",
  inputSchema: {
    proposed_action_id: z.string().uuid().describe("The proposed action to decide on."),
    decision: z.enum(["approved", "rejected"]),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ proposed_action_id, decision }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("proposed_actions")
      .update({
        status: decision,
        decided_by: ctx.getUserId(),
        decided_at: new Date().toISOString(),
      })
      .eq("id", proposed_action_id)
      .eq("status", "pending")
      .select("id, status, proposal")
      .maybeSingle();
    if (error) {
      return {
        content: [{ type: "text", text: `Could not record decision: ${error.message}. Only guild leaders can decide.` }],
        isError: true,
      };
    }
    if (!data) {
      return {
        content: [{ type: "text", text: "Proposed action not found or already decided." }],
        structuredContent: { recorded: false },
      };
    }
    return {
      content: [{ type: "text", text: `Decision recorded: ${decision}.` }],
      structuredContent: { recorded: true, action: data },
    };
  },
});
