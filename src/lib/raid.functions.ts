import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeRoleGaps, flushGrokBotNotifications } from "./raid-core.server";

const raidRole = z.enum(["tank", "healer", "damage"]);
const signupStatus = z.enum(["confirmed", "tentative", "unavailable", "standby"]);

// ---------- Guilds & membership ----------

export const getMyGuilds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("memberships")
      .select("role, display_name, guild_id, guilds(id, name, invite_code, is_demo)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createGuild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ name: z.string().min(2).max(80), displayName: z.string().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: guild, error } = await context.supabase
      .from("guilds")
      .insert({ name: data.name, created_by: context.userId })
      .select("id, invite_code")
      .single();
    if (error) throw new Error(error.message);
    const { error: mErr } = await context.supabase.from("memberships").insert({
      guild_id: guild.id,
      user_id: context.userId,
      role: "leader",
      display_name: data.displayName,
    });
    if (mErr) throw new Error(mErr.message);
    return guild;
  });

export const joinGuildByInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ inviteCode: z.string().min(3).max(40), displayName: z.string().max(60).default("") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: guildId, error } = await context.supabase.rpc("join_guild_by_invite", {
      _invite_code: data.inviteCode,
      _display_name: data.displayName,
    });
    if (error) throw new Error(error.message);
    return { guildId };
  });

// ---------- Characters ----------

export const listMyCharacters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ guildId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("characters")
      .select("*")
      .eq("guild_id", data.guildId)
      .eq("user_id", context.userId)
      .order("created_at");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveCharacter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        guildId: z.string().uuid(),
        name: z.string().min(1).max(60),
        className: z.string().max(60).default(""),
        roles: z.array(raidRole).min(1),
        willingToSwitch: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      guild_id: data.guildId,
      user_id: context.userId,
      name: data.name,
      class_name: data.className,
      roles: data.roles,
      willing_to_switch: data.willingToSwitch,
    };
    const query = data.id
      ? context.supabase.from("characters").update(payload).eq("id", data.id).eq("user_id", context.userId)
      : context.supabase.from("characters").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCharacter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("characters")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Raids ----------

export const listRaids = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ guildId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("raids")
      .select("*")
      .eq("guild_id", data.guildId)
      .gte("ends_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .order("starts_at");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getRaidDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ raidId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: raid, error } = await context.supabase
      .from("raids")
      .select("*")
      .eq("id", data.raidId)
      .single();
    if (error) throw new Error(error.message);

    const [{ data: signups }, { data: members }, { data: myCharacters }] = await Promise.all([
      context.supabase
        .from("signups")
        .select("*, characters(name, class_name)")
        .eq("raid_id", data.raidId),
      context.supabase
        .from("memberships")
        .select("user_id, display_name, role")
        .eq("guild_id", raid.guild_id),
      context.supabase
        .from("characters")
        .select("*")
        .eq("guild_id", raid.guild_id)
        .eq("user_id", context.userId),
    ]);

    const memberName = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));
    const roster = (signups ?? []).map((s) => ({
      ...s,
      display_name: memberName.get(s.user_id) ?? "Unknown",
      is_mine: s.user_id === context.userId,
    }));

    return {
      raid,
      signups: roster,
      myCharacters: myCharacters ?? [],
      mySignup: roster.find((s) => s.is_mine) ?? null,
      gaps: computeRoleGaps(raid, signups ?? []),
      isLeader: (members ?? []).some((m) => m.user_id === context.userId && m.role === "leader"),
    };
  });

export const upsertSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        raidId: z.string().uuid(),
        characterId: z.string().uuid().nullable(),
        role: raidRole,
        status: signupStatus,
        note: z.string().max(280).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("signups").upsert(
      {
        raid_id: data.raidId,
        user_id: context.userId,
        character_id: data.characterId,
        role: data.role,
        status: data.status,
        note: data.note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "raid_id,user_id" },
    );
    if (error) throw new Error(error.message);
    await flushGrokBotNotifications(data.raidId);
    return { ok: true };
  });

export const cancelSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ signupId: z.string().uuid(), raidId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("signups")
      .delete()
      .eq("id", data.signupId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    // The DB trigger has now persisted any role-gap alert; nudge Grok Bot.
    await flushGrokBotNotifications(data.raidId);
    return { ok: true };
  });

// ---------- Leader: raids, alerts, decisions ----------

export const createRaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        guildId: z.string().uuid(),
        title: z.string().min(2).max(120),
        content: z.string().max(500).default(""),
        startsAt: z.string(),
        endsAt: z.string(),
        timeZone: z.string().max(60).default("UTC"),
        notes: z.string().max(1000).default(""),
        reqTanks: z.number().int().min(0).max(40).default(2),
        reqHealers: z.number().int().min(0).max(40).default(2),
        reqDamage: z.number().int().min(0).max(80).default(6),
        idempotencyKey: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      guild_id: data.guildId,
      title: data.title,
      content: data.content,
      starts_at: data.startsAt,
      ends_at: data.endsAt,
      time_zone: data.timeZone,
      notes: data.notes,
      req_tanks: data.reqTanks,
      req_healers: data.reqHealers,
      req_damage: data.reqDamage,
      created_by: context.userId,
      idempotency_key: data.idempotencyKey ?? null,
    };
    // Idempotent: a retried create with the same key returns the existing raid.
    if (payload.idempotency_key) {
      const { data: existing } = await context.supabase
        .from("raids")
        .select("*")
        .eq("idempotency_key", payload.idempotency_key)
        .maybeSingle();
      if (existing) return existing;
    }
    const { data: raid, error } = await context.supabase.from("raids").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return raid;
  });

export const updateRaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        raidId: z.string().uuid(),
        title: z.string().min(2).max(120).optional(),
        content: z.string().max(500).optional(),
        startsAt: z.string().optional(),
        endsAt: z.string().optional(),
        timeZone: z.string().max(60).optional(),
        notes: z.string().max(1000).optional(),
        reqTanks: z.number().int().min(0).max(40).optional(),
        reqHealers: z.number().int().min(0).max(40).optional(),
        reqDamage: z.number().int().min(0).max(80).optional(),
        status: z.enum(["planned", "cancelled", "completed"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Partial<{
      title: string;
      content: string;
      starts_at: string;
      ends_at: string;
      time_zone: string;
      notes: string;
      req_tanks: number;
      req_healers: number;
      req_damage: number;
      status: string;
    }> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.content !== undefined) patch.content = data.content;
    if (data.startsAt !== undefined) patch.starts_at = data.startsAt;
    if (data.endsAt !== undefined) patch.ends_at = data.endsAt;
    if (data.timeZone !== undefined) patch.time_zone = data.timeZone;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.reqTanks !== undefined) patch.req_tanks = data.reqTanks;
    if (data.reqHealers !== undefined) patch.req_healers = data.reqHealers;
    if (data.reqDamage !== undefined) patch.req_damage = data.reqDamage;
    if (data.status !== undefined) patch.status = data.status;
    const { data: raid, error } = await context.supabase
      .from("raids")
      .update(patch)
      .eq("id", data.raidId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return raid;
  });

export const getLeaderDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ guildId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: alerts }, { data: actions }, { data: raids }] = await Promise.all([
      context.supabase
        .from("alerts")
        .select("*, raids(title, starts_at)")
        .eq("guild_id", data.guildId)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("proposed_actions")
        .select("*, raids(title), alerts(message)")
        .eq("guild_id", data.guildId)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("raids")
        .select("*, signups(role, status)")
        .eq("guild_id", data.guildId)
        .gte("ends_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .order("starts_at"),
    ]);
    const raidsWithGaps = (raids ?? []).map((r) => ({
      ...r,
      gaps: computeRoleGaps(r, r.signups ?? []),
    }));
    return { alerts: alerts ?? [], actions: actions ?? [], raids: raidsWithGaps };
  });

export const proposeAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        guildId: z.string().uuid(),
        raidId: z.string().uuid(),
        alertId: z.string().uuid().nullable(),
        proposal: z.string().min(2).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("proposed_actions")
      .insert({
        guild_id: data.guildId,
        raid_id: data.raidId,
        alert_id: data.alertId,
        proposal: data.proposal,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const decideAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ actionId: z.string().uuid(), decision: z.enum(["approved", "rejected"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Approving a draft records the decision only — nothing is marked as sent
    // unless a real messaging integration confirms delivery.
    const { data: row, error } = await context.supabase
      .from("proposed_actions")
      .update({
        status: data.decision,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.actionId)
      .eq("status", "pending")
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
