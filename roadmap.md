# Raid Night Autopilot — build roadmap

- [x] Store Grok Bot webhook secrets (GROKBOT_WEBHOOK_URL, GROKBOT_WEBHOOK_TOKEN)
- [ ] DB migration: guilds, memberships, characters, raids, signups, alerts, proposed_actions, audit_log + RLS + grants + healer-cancel alert trigger + demo guild seed
- [ ] Auth: /auth login/signup, _authenticated layout, auth-attacher middleware in start.ts, onAuthStateChange in __root
- [ ] App screens: raids list, raid detail (signup controls, roster, role gaps, realtime), my characters, leader dashboard (alerts + proposed actions), join-via-invite
- [ ] Shared server logic: signup mutations, gap recalculation, webhook ping to Grok Bot on new alerts — only AFTER the alert row is persisted; payload includes alert id + dedupe_key so repeated deliveries don't duplicate messages; logged to audit
- [ ] MCP server: @lovable.dev/mcp-js, OAuth (Supabase issuer), consent route, 7 tools (list_raids, create_raid, get_raid_status, update_raid, get_pending_alerts, acknowledge_alert, record_leader_decision), manifest extraction
- [ ] Dark fantasy theme (gold accents), head metadata per route
- [ ] MIT LICENCE + README setup docs + MCP docs
- [ ] Verify: build, demo flow end-to-end, report what is tested vs pending Grok Bot config
