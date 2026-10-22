Build Raid Night Autopilot, a World of Warcraft guild raid coordination app for a hackathon.

The raid leader manages raids through Grok Bot using our custom MCP server. Guild members use this web app to view raids, sign up and change their availability. Both interfaces use the same Supabase data.

Required infrastructure
Use my own existing Supabase project. Ask me to connect it before implementing the backend. Do not provision a replacement database or use Lovable Cloud as the backend.
Use Supabase Auth, Postgres and server-side functions.
Users must sign in before seeing any guild content. Only login and signup screens are public.
Signing in does not automatically grant access to a guild. Use invite-based guild membership and enforce access through Supabase Row Level Security.
Never expose service-role keys or backend secrets in browser code.
Deliver working functionality backed by Supabase, not a static mockup.
The project must be open source. Include an MIT licence and setup instructions, keeping credentials and private data out of the repository.
Roles
Guild member

View raids for their guild.
Manage their own characters and supported roles: tank, healer or damage.
Sign up as confirmed, tentative, unavailable or standby.
Choose a character and role for each signup.
Update or cancel their own signup, optionally leaving a short note.
Explicitly indicate willingness to switch roles.
Raid leader

View and manage their guild’s raids and roster.
Configure required counts for each role.
Review missing roles, cancellations and tentative signups.
Review and approve proposed actions and message drafts.
Have an admin interface as a fallback, although Grok Bot is the primary conversational interface.
Member experience
Create a polished, responsive fantasy-themed interface with dark backgrounds, readable typography and restrained gold accents. Avoid copyrighted game artwork.

Main screens:

Sign in / sign up / accept guild invitation.
Upcoming raids.
Raid detail with schedule, signup controls, roster and role gaps.
My characters.
Leader dashboard with pending alerts and proposed actions.
Each raid includes title, planned content, start and end time, time zone, notes and configurable role requirements. Store timestamps consistently and display the time zone clearly.

Use realtime updates so changes to signups appear without refreshing.

Core behaviour
A leader creates a raid. Members sign up through the app. If a confirmed healer cancels:

Save the signup change.
Recalculate the confirmed roster and role gaps.
Create a persistent alert describing the change.
Make that alert available to Grok Bot.
Show eligible standby members as possible replacements, without automatically confirming them.
Let the leader approve a proposed next action.
Use deterministic application logic for role counts, permissions and signup state. Tentative and standby members must not count as confirmed. Do not invent availability or assign an alternative role without the member having offered it.

Custom MCP server — required deliverable
Implement an authenticated, remotely accessible MCP server for the app’s raid operations. This is an actual MCP interface, not merely REST endpoints labelled “MCP,” and not Supabase’s database administration MCP.

Expose a small set of tools:

list_raids
create_raid
get_raid_status
update_raid
get_pending_alerts
acknowledge_alert
record_leader_decision
Use shared backend business logic for both the app and MCP tools. Give tools clear input schemas, structured results and useful validation errors. Make retried mutations safe against duplication.

Authenticate MCP requests and scope every operation to the authorised leader and guild. Do not give the bot unrestricted database access.

Document the MCP endpoint, supported transport, authentication setup and example tool calls. If the connected hosting environment cannot host the MCP server, explicitly explain the limitation and generate a separately deployable server in the repository with setup instructions. Do not silently replace it with a mock.

Grok Bot’s exact custom MCP connection and event-trigger capabilities still need confirmation. Do not claim a working Grok Bot integration until it has been tested.

Alerts and bot integration
MCP access alone does not proactively notify Grok Bot.

Implement a durable pending-alert queue that the bot can poll through get_pending_alerts, then acknowledge after handling. Include deduplication and processing status.

Keep a future event/webhook trigger possible, but do not invent a Grok Bot webhook API. Clearly distinguish:

An alert recorded in our app.
An alert retrieved by the bot.
A message actually delivered to the raid leader.
Likewise, approving a draft must not mark it as sent unless a real messaging integration confirms delivery.

Data and demo
Create migrations for guilds, memberships, characters, raids, signups, alerts, proposed actions and an audit log. Apply appropriate constraints and RLS policies.

Provide an optional, clearly labelled fictional demo guild with sample characters and a raid. Keep demo data isolated from real guilds and restricted to authorised demo users.

The essential demo is:

Create a raid through an MCP tool.
Open it as a signed-in member.
Cancel a confirmed healer signup.
Show the updated roster gap and persistent alert.
Retrieve the alert through MCP.
Record the leader’s decision and show it in the app.
Prioritise this complete flow before adding newsletters, graphics, Discord integrations or other guild features.

First ask me to connect my Supabase project, then implement the database, authentication, member interface and MCP server. At completion, explain what works, what has been tested and what still requires Grok Bot configuration.