# Raid Night Planner (Raid Night Autopilot)

A World of Warcraft–style guild raid coordination app. The raid leader manages
raids through **Grok Bot via this app's custom MCP server**; guild members use
this web app to view raids, sign up and manage their availability. Both
interfaces share the same Supabase data.

Open source under the [MIT licence](LICENSE).

## Features

- Email/password sign-in (Supabase Auth). Only login/signup are public — all
  guild content requires an account.
- Invite-based guild membership, enforced by Postgres Row Level Security.
- Members: manage characters and roles (tank / healer / damage), sign up as
  confirmed / tentative / unavailable / standby, update or cancel with a note,
  flag willingness to switch roles.
- Leaders: create raids (in-app fallback UI; Grok Bot is the primary
  interface), configure role requirements, review role gaps, alerts and
  proposed actions, approve or reject decisions.
- Confirmed-cancellation alerts: when a confirmed signup is cancelled and the
  role drops below the requirement, a persistent, deduplicated alert is
  recorded by a database trigger and nudged to Grok Bot via webhook.
- Realtime roster updates (Supabase Realtime on signups and alerts).
- Optional fictional demo guild — join with invite code `DEMO-RAID`.

## Setup

1. **Supabase** — connect your own Supabase project (Lovable: Settings →
   General → External Supabase). Database migrations live under
   `supabase/migrations/` and are applied through Lovable's migration tool.
2. **Auth** — enable the email provider in Supabase (Authentication →
   Providers). Add your app origins to Authentication → URL Configuration →
   Redirect URLs.
3. **Secrets** — set these project secrets (never commit them):
   - `GROKBOT_WEBHOOK_URL` — webhook endpoint that nudges Grok Bot when a new
     alert is recorded.
   - `GROKBOT_WEBHOOK_TOKEN` — bearer token for that webhook.
4. **Run** — `bun install && bun dev`.

Credentials and private data must stay out of the repository: secrets are
stored in the hosting environment, and `.env` files are not committed.

## MCP server (for Grok Bot)

See [docs/mcp.md](docs/mcp.md) for the endpoint, transport, authentication and
example tool calls.

## Alert lifecycle

| Status      | Meaning                                                        |
| ----------- | -------------------------------------------------------------- |
| `recorded`  | Alert persisted in the app (and webhook-nudged to the bot).    |
| `retrieved` | The bot polled it via `get_pending_alerts`.                    |
| `delivered` | The bot confirmed actual delivery via `acknowledge_alert`.     |

Approving a proposed action records the decision only — nothing is marked as
sent without a real messaging integration confirming delivery.

## Demo flow

1. Create a raid through the MCP `create_raid` tool (or the leader dashboard).
2. Open it as a signed-in member and sign up a confirmed healer.
3. Cancel that healer signup — the roster gap and a persistent alert appear.
4. Poll the alert through MCP `get_pending_alerts`.
5. Record the leader's decision (`record_leader_decision`) and see it in the
   app.
