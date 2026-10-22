import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { createProposedAction, decideProposedAction } from "../../raid-core.server";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "record_leader_decision",
  title: "Record leader decision",
  description:
    "Record the raid leader's decision (approve or reject) on a proposed action. Pass proposed_action_id for an existing proposal (ids are listed in get_raid_status), or alert_id plus proposal to propose the next action for that alert and decide it in one call. Retrying the same call never duplicates the proposal or the decision. This records the decision only — approving never marks any message as sent.",
  inputSchema: {
    proposed_action_id: z
      .string()
      .uuid()
      .optional()
      .describe("Existing proposed action to decide on. Omit when passing alert_id + proposal."),
    alert_id: z
      .string()
      .uuid()
      .optional()
      .describe("Alert the decision responds to, when proposing a new action in the same call."),
    proposal: z
      .string()
      .min(2)
      .max(500)
      .optional()
      .describe(
        "The proposed next action, e.g. 'Ask Sam to take the open healer spot'. Required with alert_id.",
      ),
    decision: z.enum(["approved", "rejected"]),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ proposed_action_id, alert_id, proposal, decision }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const byId = Boolean(proposed_action_id);
    const byAlert = Boolean(alert_id && proposal?.trim());
    if (byId === byAlert) {
      return {
        content: [
          {
            type: "text",
            text: "Pass either proposed_action_id, or alert_id together with proposal — not both and not neither.",
          },
        ],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);
    try {
      let actionId = proposed_action_id;
      let proposalCreated = false;
      if (!actionId) {
        const { data: alert, error } = await supabase
          .from("alerts")
          .select("id, guild_id, raid_id")
          .eq("id", alert_id!)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!alert) {
          return {
            content: [{ type: "text", text: "Alert not found, or you don't lead its guild." }],
            isError: true,
          };
        }
        const { action, created } = await createProposedAction(supabase, {
          guildId: alert.guild_id,
          raidId: alert.raid_id,
          alertId: alert.id,
          proposal: proposal!,
        });
        actionId = action.id;
        proposalCreated = created;
      }
      const { action, changed } = await decideProposedAction(supabase, {
        actionId,
        decision,
        userId: ctx.getUserId()!,
      });
      const result = {
        recorded: true,
        already_recorded: !changed,
        proposal_created: proposalCreated,
        action: {
          proposed_action_id: action.id,
          alert_id: action.alert_id,
          proposal: action.proposal,
          status: action.status,
          decided_at: action.decided_at,
        },
      };
      return {
        content: [
          {
            type: "text",
            text: `${changed ? "Decision recorded" : "Decision was already recorded"}: ${decision}. Nothing has been sent.`,
          },
        ],
        structuredContent: result,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text",
            text: `Could not record decision: ${message} Only guild leaders can decide.`,
          },
        ],
        isError: true,
      };
    }
  },
});
