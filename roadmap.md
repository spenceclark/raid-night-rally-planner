# Raid Night Autopilot — build roadmap

- [x] Store Grok Bot webhook secrets (GROKBOT_WEBHOOK_URL, GROKBOT_WEBHOOK_TOKEN)
- [x] DB migration: guilds, memberships, characters, raids, signups, alerts, proposed_actions, audit_log + RLS + grants + healer-cancel alert trigger + demo guild seed
- [x] Auth: /auth login/signup, _authenticated layout, auth-attacher middleware in start.ts, onAuthStateChange in __root
- [x] App screens: raids list, raid detail (signup controls, roster, role gaps, realtime), my characters, leader dashboard (alerts + proposed actions), join-via-invite
- [x] Shared server logic: signup mutations, gap recalculation, webhook ping to Grok Bot on new alerts — only AFTER the alert row is persisted; payload includes alert id + dedupe_key so repeated deliveries don't duplicate messages; logged to audit
- [x] MCP server: @lovable.dev/mcp-js, OAuth (Supabase issuer), consent route, 7 tools, manifest extracted
- [x] Dark fantasy theme (gold accents), head metadata per route
- [x] MIT LICENCE + README setup docs + docs/mcp.md
- [x] Verified: build clean; e2e demo flow (sign in → join demo guild → character → confirmed healer signup → cancel → gap + persistent alert + webhook nudge → leader propose/approve)
- [ ] Publish the app (user action) — MCP endpoint and OAuth go live at publish
- [ ] Grok Bot end-to-end test after publish (spec: do not claim working until tested)
