import { auth, defineMcp } from "@lovable.dev/mcp-js";

import acknowledgeAlertTool from "./tools/acknowledge-alert";
import createRaidTool from "./tools/create-raid";
import getPendingAlertsTool from "./tools/get-pending-alerts";
import getRaidStatusTool from "./tools/get-raid-status";
import listRaidsTool from "./tools/list-raids";
import recordLeaderDecisionTool from "./tools/record-leader-decision";
import updateRaidTool from "./tools/update-raid";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "raid-night-planner",
  title: "Raid Night Planner",
  version: "0.1.0",
  instructions:
    "Raid Night Autopilot tools for guild raid coordination. Create and manage raids, inspect roster status and role gaps, poll the durable alert queue, acknowledge alerts after delivering them, and record leader decisions. All operations are scoped to the signed-in leader's guilds. Only confirmed signups count toward role requirements.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listRaidsTool,
    createRaidTool,
    getRaidStatusTool,
    updateRaidTool,
    getPendingAlertsTool,
    acknowledgeAlertTool,
    recordLeaderDecisionTool,
  ],
});
