Add a repeatable demo-data seed for Raid Night Autopilot using the existing Supabase schema.

Use clearly fictional players. Scope everything to a demo guild named **The Ready Check**. Do not modify other guilds, create fake authentication accounts, or send webhook notifications while seeding.

Create a leader-only “Reset demo scenario” action. It should restore only this scenario’s seed-owned records, clear its old alerts and decisions, and avoid duplicates. Preserve actual user accounts and memberships.

## Raid

Title: Friday Night: Into the Citadel
Start: 23 October 2026, 20:00 Europe/London
End: 23 October 2026, 23:00 Europe/London
Invites: 19:45 Europe/London
Tone: Friendly progression; newcomers welcome if prepared.
Notes: Bring consumables. Let the leader know if you’ll be late. Standby does not mean a guaranteed place.

Requirements:
- 2 tanks
- 4 healers
- 14 damage
- 20 confirmed players total

## Confirmed roster

Each row is: player | character | class | raid role

1. Morgan | Ironward | Warrior | Tank
2. Priya | Dawnshield | Paladin | Tank
3. Alex | Mosslight | Druid | Healer
4. Beth | Silverhymn | Priest | Healer
5. Callum | Raincaller | Shaman | Healer
6. Dina | Mistpetal | Monk | Healer
7. Elliot | Emberquill | Mage | Damage
8. Freya | Nightstring | Hunter | Damage
9. George | Ashpact | Warlock | Damage
10. Hana | Quietblade | Rogue | Damage
11. Isaac | Frostgrave | Death Knight | Damage
12. Jess | Starbough | Druid | Damage
13. Kai | Riftstep | Demon Hunter | Damage
14. Leah | Stormbite | Shaman | Damage
15. Max | Brightsteel | Paladin | Damage
16. Nia | Duskprayer | Priest | Damage
17. Owen | Cinderwing | Evoker | Damage
18. Poppy | Wildarrow | Hunter | Damage
19. Ravi | Runeflare | Mage | Damage
20. Sofia | Redfang | Warrior | Damage

Jess has explicitly offered to switch from damage to healer if asked. Do not switch Jess automatically. Explain that doing so creates a damage vacancy.
Max can tank but has NOT offered to switch for this event. Do not treat class capability as permission.

## Standby roster

These players have explicitly offered to be reserves, but are not confirmed raid attendees.

- Sam | Brookmender | Shaman | Healer
  Available 19:45–23:00. Happy to be contacted for a healer vacancy. Still needs to accept a promotion to the confirmed roster.
- Taylor | Lightkeeper | Paladin | Healer
  Available only from 21:00. Cannot cover the start of the raid.
- Uma | Granitepaw | Druid | Tank
  Available 19:45–23:00. Willing tank reserve.
- Victor | Spellwake | Mage | Damage
  Available 19:45–23:00. Willing damage reserve.
- Wren | Foxtrail | Hunter | Damage
  Available 20:00–22:00 only. Cannot cover the full raid.
- Yusuf | Shadebrand | Warlock | Damage
  Available 19:45–23:00. Willing damage reserve.

## Other responses

Tentative:
- Zara | Moonbrook | Druid | Healer
  Might be available; will confirm by 18:00 on raid day.
- Ben | Stoneguard | Warrior | Tank
  Work may run late. No confirmed arrival time.

Unavailable:
- Chloe | Sunthread | Priest | Healer
  Away this Friday. Do not suggest contacting her as a replacement.
- Dev | Felwhisper | Warlock | Damage
  Cannot attend.

No response:
- Erin | Snowglyph | Mage | Damage
- Finn | Oakwarden | Druid | Tank

Do not count tentative, unavailable, no-response or standby players towards confirmed role totals.

## Make the cancellation demo usable

Allow me to map my existing signed-in demo player and character to Alex’s confirmed healer signup, using the real account rather than creating a fake login. Preserve that mapping when resetting.

Before cancellation, the app must show:
- 20/20 confirmed
- Tanks 2/2
- Healers 4/4
- Damage 14/14
- 6 reserves

When I cancel my healer signup through the normal member interface:
- Show 19/20 confirmed and healers 3/4.
- Create the usual alert and trigger the existing Grok webhook.
- Expose the reserve availability and role-switch permissions through MCP.

The evidence should let Grok identify Sam as a suitable person to ask first, explain why Taylor cannot cover the start, and describe Jess plus a damage reserve as an alternative requiring two confirmations.

Do not hardcode Grok’s recommendation or automatically promote a reserve.

Use structured fields for roles, response status, availability and willingness to switch where supported. If schema changes are necessary, add migrations and update the MCP responses so Grok receives those facts.

Keep all demo players visibly fictional. If the schema requires a user account for every signup, implement a demo-scoped participant representation rather than creating artificial Supabase Auth users or weakening authentication/RLS.

Verify the roster totals, cancellation behaviour and repeatable reset. Keep reset and seeding operations silent; normal user actions after seeding should use the real notification flow.