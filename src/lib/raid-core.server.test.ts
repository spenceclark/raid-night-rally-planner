import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createProposedAction, decideProposedAction } from "./raid-core.server";

type Row = Record<string, unknown>;

// Minimal in-memory stand-in for the proposed_actions query chains used above.
function fakeSupabase(rows: Row[] = []) {
  let nextId = 1;
  const query = (op: "select" | "insert" | "update", payload?: Row) => {
    const filters: Array<(r: Row) => boolean> = [];
    const run = () => {
      if (op === "insert") {
        const row = {
          id: `pa-${nextId++}`,
          status: "pending",
          decided_by: null,
          decided_at: null,
          created_at: "now",
          ...payload,
        };
        rows.push(row);
        return [row];
      }
      const matched = rows.filter((r) => filters.every((f) => f(r)));
      if (op === "update") matched.forEach((r) => Object.assign(r, payload));
      return matched;
    };
    const chain = {
      select: () => chain,
      eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), chain),
      is: (k: string, v: unknown) => (filters.push((r) => (r[k] ?? null) === v), chain),
      limit: () => chain,
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      single: async () => ({ data: run()[0], error: null }),
    };
    return chain;
  };
  const client = {
    from: () => ({
      select: () => query("select"),
      insert: (p: Row) => query("insert", p),
      update: (p: Row) => query("update", p),
    }),
  };
  return { client: client as unknown as SupabaseClient, rows };
}

const input = { guildId: "g1", raidId: "r1", alertId: "a1", proposal: "Ask Sam to heal" };

describe("createProposedAction", () => {
  it("returns the existing proposal on retry instead of duplicating it", async () => {
    const { client, rows } = fakeSupabase();
    const first = await createProposedAction(client, input);
    const retry = await createProposedAction(client, { ...input, proposal: " Ask Sam to heal " });
    expect(first.created).toBe(true);
    expect(retry).toEqual({ action: first.action, created: false });
    expect(rows).toHaveLength(1);
  });
});

describe("decideProposedAction", () => {
  it("records a decision once and treats the same retry as a no-op", async () => {
    const { client } = fakeSupabase();
    const { action } = await createProposedAction(client, input);
    const decide = { actionId: action.id, decision: "approved" as const, userId: "u1" };
    const first = await decideProposedAction(client, decide);
    const retry = await decideProposedAction(client, decide);
    expect(first.changed).toBe(true);
    expect(first.action.status).toBe("approved");
    expect(retry.changed).toBe(false);
  });

  it("refuses a conflicting decision and unknown ids", async () => {
    const { client } = fakeSupabase();
    const { action } = await createProposedAction(client, input);
    await decideProposedAction(client, { actionId: action.id, decision: "approved", userId: "u1" });
    await expect(
      decideProposedAction(client, { actionId: action.id, decision: "rejected", userId: "u1" }),
    ).rejects.toThrow("already approved");
    await expect(
      decideProposedAction(client, { actionId: "missing", decision: "approved", userId: "u1" }),
    ).rejects.toThrow("not found");
  });
});
