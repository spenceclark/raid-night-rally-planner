# MCP server — Raid Night Planner

This app exposes an authenticated, remotely accessible MCP server for raid
operations. It is a real MCP interface (tools with schemas and structured
results), not relabelled REST endpoints, and it is separate from Supabase's
database administration MCP.

## Endpoint and transport

- **URL:** `https://<your-published-app-domain>/mcp`
- **Transport:** Streamable HTTP (handled by `@lovable.dev/mcp-js`)
- **Server name:** `raid-night-planner`

The endpoint is generated from `src/lib/mcp/index.ts` by the MCP Vite plugin;
do not hand-edit the generated route files.

## Authentication

OAuth 2.1 with dynamic client registration, backed by Supabase Auth:

- Issuer: `https://<project-ref>.supabase.co/auth/v1`
- Consent screen: `/.lovable/oauth/consent` (built into this app)
- MCP clients (e.g. Grok Bot) register dynamically and send the user through
  the consent flow. The resulting bearer token is validated on every call.
- Every operation runs as the calling user under Row Level Security: members
  can read their guilds' data; only leaders can create/update raids, poll
  alerts, acknowledge them or record decisions. The bot never gets
  unrestricted database access.

OAuth activation completes at publish time. Until the app is published and the
Supabase OAuth server is enabled, the endpoint cannot issue tokens.

## Tools

| Tool                     | Who         | Purpose                                                          |
| ------------------------ | ----------- | ---------------------------------------------------------------- |
| `list_raids`             | member      | List upcoming raids for a guild.                                 |
| `create_raid`            | leader      | Create a raid. Idempotent via `idempotency_key`.                 |
| `get_raid_status`        | member      | Confirmed counts, role gaps, standby/tentative counts, proposed actions with ids. |
| `update_raid`            | leader      | Update schedule, notes, status or role requirements.             |
| `get_pending_alerts`     | leader      | Poll the durable alert queue; marks polled alerts `retrieved`.   |
| `acknowledge_alert`      | leader      | Mark an alert `delivered` after real delivery to the leader.     |
| `record_leader_decision` | leader      | Approve/reject a proposed action (by id, or propose + decide for an alert). Records the decision only. |

## Example calls

Create a raid (idempotent — safe to retry with the same key):

```json
{
  "method": "tools/call",
  "params": {
    "name": "create_raid",
    "arguments": {
      "guild_id": "…",
      "title": "Molten Depths — Heroic",
      "content": "Heroic clear, bosses 1-8",
      "starts_at": "2026-10-25T19:00:00+00:00",
      "ends_at": "2026-10-25T22:00:00+00:00",
      "time_zone": "UTC",
      "req_tanks": 2,
      "req_healers": 2,
      "req_damage": 6,
      "idempotency_key": "grok-2026-10-25-molten-depths"
    }
  }
}
```

Poll alerts:

```json
{
  "method": "tools/call",
  "params": { "name": "get_pending_alerts", "arguments": { "guild_id": "…" } }
}
```

Record the leader's decision on an alert in one call (proposes the action and
decides it; retrying returns the same proposal and decision, never a
duplicate):

```json
{
  "method": "tools/call",
  "params": {
    "name": "record_leader_decision",
    "arguments": {
      "alert_id": "…",
      "proposal": "Ask Sam to take the open healer spot. Sam must accept before being promoted.",
      "decision": "approved"
    }
  }
}
```

Or decide a proposal that already exists — `get_raid_status` lists each one
under `proposed_actions` with its `proposed_action_id`:

```json
{
  "method": "tools/call",
  "params": {
    "name": "record_leader_decision",
    "arguments": { "proposed_action_id": "…", "decision": "approved" }
  }
}
```

Approving records the decision only: nothing is messaged and no reserve is
promoted.

## Proactive notification

MCP access alone does not notify the bot. The app also POSTs a best-effort
webhook nudge to `GROKBOT_WEBHOOK_URL` after a new alert is persisted. The
payload includes `alert_id` and `dedupe_key` so repeated deliveries can be
deduplicated downstream. The nudge never changes alert status — only
`get_pending_alerts` (retrieval) and `acknowledge_alert` (confirmed delivery)
do.

Grok Bot's exact custom MCP connection and event-trigger capabilities still
need confirmation; the integration is not claimed working until tested
end-to-end.
