// Shared, deterministic raid business logic. Used by both the app server
// functions and the MCP tools so both interfaces behave identically.
// Server-only: never import from components.
import type { SupabaseClient } from "@supabase/supabase-js";

export type RaidRole = "tank" | "healer" | "damage";
export type SignupStatus = "confirmed" | "tentative" | "unavailable" | "standby" | "no_response";

export interface RaidRequirements {
  req_tanks: number;
  req_healers: number;
  req_damage: number;
}

export interface RoleGap {
  required: number;
  confirmed: number;
  missing: number;
}

export interface RoleGaps {
  tank: RoleGap;
  healer: RoleGap;
  damage: RoleGap;
}

/**
 * Deterministic role-gap calculation. Only `confirmed` signups count —
 * tentative, standby and unavailable never do. No availability is invented
 * and no role reassignment happens here.
 */
export function computeRoleGaps(
  raid: RaidRequirements,
  signups: Array<{ role: RaidRole; status: SignupStatus }>,
): RoleGaps {
  const confirmed = { tank: 0, healer: 0, damage: 0 };
  for (const s of signups) {
    if (s.status === "confirmed") confirmed[s.role] += 1;
  }
  const gap = (required: number, count: number): RoleGap => ({
    required,
    confirmed: count,
    missing: Math.max(0, required - count),
  });
  return {
    tank: gap(raid.req_tanks, confirmed.tank),
    healer: gap(raid.req_healers, confirmed.healer),
    damage: gap(raid.req_damage, confirmed.damage),
  };
}

export interface AlertRow {
  id: string;
  guild_id: string;
  raid_id: string;
  kind: string;
  message: string;
  dedupe_key: string;
  status: string;
  created_at: string;
}

/**
 * Best-effort nudge to Grok Bot for a persisted alert. The alert row MUST
 * already exist in the database before this is called. The payload carries
 * the alert id and dedupe key so repeated webhook deliveries can be
 * deduplicated downstream. A successful POST means the bot endpoint received
 * the nudge — it does NOT mark the alert delivered to the raid leader.
 */
export async function notifyGrokBot(alert: AlertRow): Promise<{
  attempted: boolean;
  ok: boolean;
  status?: number;
}> {
  const url = process.env["GROKBOT_WEBHOOK_URL"];
  const token = process.env["GROKBOT_WEBHOOK_TOKEN"];
  if (!url || !token) return { attempted: false, ok: false };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        alert_id: alert.id,
        dedupe_key: alert.dedupe_key,
        kind: alert.kind,
        message: alert.message,
        raid_id: alert.raid_id,
        guild_id: alert.guild_id,
        recorded_at: alert.created_at,
      }),
    });
    return { attempted: true, ok: res.ok, status: res.status };
  } catch {
    return { attempted: true, ok: false };
  }
}

/**
 * Finds alerts that were persisted but not yet nudged to Grok Bot, pings the
 * webhook for each, and records the attempt (webhook_notified_at + audit
 * log). Uses the admin client because alert bookkeeping is privileged —
 * callers must already have authorized the triggering user action.
 */
export async function flushGrokBotNotifications(raidId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: pending } = await supabaseAdmin
    .from("alerts")
    .select("id, guild_id, raid_id, kind, message, dedupe_key, status, created_at")
    .eq("raid_id", raidId)
    .is("webhook_notified_at", null)
    .order("created_at", { ascending: true })
    .limit(20);

  for (const alert of pending ?? []) {
    const result = await notifyGrokBot(alert as AlertRow);
    if (!result.attempted) return; // webhook not configured — leave for later
    await supabaseAdmin
      .from("alerts")
      .update({ webhook_notified_at: new Date().toISOString() })
      .eq("id", alert.id);
    await supabaseAdmin.from("audit_log").insert({
      guild_id: alert.guild_id,
      actor_id: null,
      action: "grokbot_webhook_nudge",
      entity: "alert",
      entity_id: alert.id,
      detail: { ok: result.ok, status: result.status ?? null },
    });
  }
}

export type LeaderDecision = "approved" | "rejected";

export interface ProposedActionRow {
  id: string;
  guild_id: string;
  raid_id: string;
  alert_id: string | null;
  proposal: string;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

/**
 * Records a proposed next action for a raid, as the calling leader (RLS
 * enforces leadership). Retry-safe: the same proposal text for the same alert
 * (or raid, without an alert) returns the existing row instead of a duplicate.
 */
export async function createProposedAction(
  supabase: SupabaseClient,
  input: { guildId: string; raidId: string; alertId: string | null; proposal: string },
): Promise<{ action: ProposedActionRow; created: boolean }> {
  const proposal = input.proposal.trim();
  let existing = supabase
    .from("proposed_actions")
    .select("*")
    .eq("raid_id", input.raidId)
    .eq("proposal", proposal);
  existing = input.alertId ? existing.eq("alert_id", input.alertId) : existing.is("alert_id", null);
  const { data: found, error: findError } = await existing.limit(1).maybeSingle();
  if (findError) throw new Error(findError.message);
  if (found) return { action: found as ProposedActionRow, created: false };

  const { data, error } = await supabase
    .from("proposed_actions")
    .insert({ guild_id: input.guildId, raid_id: input.raidId, alert_id: input.alertId, proposal })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { action: data as ProposedActionRow, created: true };
}

/**
 * Records the leader's decision on a pending proposed action. This records the
 * decision only — approving a draft never marks a message as sent. Retrying
 * the same decision is a no-op; a conflicting decision is refused.
 */
export async function decideProposedAction(
  supabase: SupabaseClient,
  input: { actionId: string; decision: LeaderDecision; userId: string },
): Promise<{ action: ProposedActionRow; changed: boolean }> {
  const { data, error } = await supabase
    .from("proposed_actions")
    .update({
      status: input.decision,
      decided_by: input.userId,
      decided_at: new Date().toISOString(),
    })
    .eq("id", input.actionId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return { action: data as ProposedActionRow, changed: true };

  const { data: current, error: readError } = await supabase
    .from("proposed_actions")
    .select("*")
    .eq("id", input.actionId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!current) throw new Error("Proposed action not found.");
  if (current.status === input.decision) {
    return { action: current as ProposedActionRow, changed: false };
  }
  throw new Error(`Proposed action was already ${current.status}.`);
}
