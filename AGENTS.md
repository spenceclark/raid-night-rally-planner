<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- Backend is the user's own Supabase project; server logic lives in TanStack server functions (`src/lib/raid.functions.ts`), never Supabase Edge Functions — the stack requires it.
- Role-gap and alert logic is shared in `src/lib/raid-core.server.ts` so the app and the MCP tools behave identically; keep both interfaces on this module.
- Confirmed-cancellation alerts are created by the `handle_confirmed_cancel` DB trigger (dedupe via `dedupe_key`), so alerts fire no matter which interface cancels a signup.
- The Grok Bot webhook nudge runs only after the alert row is persisted, sends `alert_id` + `dedupe_key`, and never changes alert status — `recorded`/`retrieved`/`delivered` transitions belong to the bot's poll/acknowledge calls.
- `supabaseAdmin` is used only for webhook bookkeeping (marking `webhook_notified_at`, audit log) after the triggering user action was already authorized; all other access goes through RLS as the caller.
- Nested route files under a leaf route need the trailing-underscore form (e.g. `raids_.$raidId.tsx`) because leaf routes render no `<Outlet />`.
- The MCP server lives in `src/lib/mcp/` with OAuth via Supabase issuer; generated routes (`src/routes/mcp.ts`, well-known metadata) come from the Vite plugin — never hand-edit them.
