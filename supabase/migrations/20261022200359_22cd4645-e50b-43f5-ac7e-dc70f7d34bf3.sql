-- Silence the cancellation trigger while the demo seed runs (transaction-local flag).
create or replace function public.handle_confirmed_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_row public.signups;
  r public.raids;
  req_count int;
  confirmed_count int;
  dkey text;
begin
  if coalesce(current_setting('raidnight.seeding', true), '') = 'on' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  old_row := old;
  if tg_op <> 'DELETE' and new.status = 'confirmed' then
    return new;
  end if;
  if old_row.status <> 'confirmed' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  select * into r from public.raids where id = old_row.raid_id;
  if not found then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  req_count := case old_row.role when 'tank' then r.req_tanks when 'healer' then r.req_healers else r.req_damage end;
  select count(*) into confirmed_count from public.signups
    where raid_id = r.id and role = old_row.role and status = 'confirmed' and id <> old_row.id;
  if confirmed_count < req_count then
    dkey := 'cancel:' || old_row.id::text;
    insert into public.alerts (guild_id, raid_id, signup_id, kind, message, dedupe_key)
    values (r.guild_id, r.id, old_row.id, 'role_gap',
      'Confirmed ' || old_row.role || ' cancelled on "' || r.title || '": ' || confirmed_count || '/' || req_count || ' confirmed.',
      dkey)
    on conflict (dedupe_key) do nothing;
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

-- Internal seed: idempotent, touches only The Ready Check scenario.
create or replace function public._seed_ready_check()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  g_id uuid;
  r_id uuid;
  d date := date '2026-10-23';
  tz text := 'Europe/London';
begin
  perform set_config('raidnight.seeding', 'on', true);

  select id into g_id from public.guilds where demo_scenario = 'ready_check';
  if g_id is null then
    insert into public.guilds (name, invite_code, is_demo, demo_scenario)
    values ('The Ready Check', 'READY-CHECK', true, 'ready_check') returning id into g_id;
  end if;

  select id into r_id from public.raids where idempotency_key = 'seed:ready-check:citadel';
  if r_id is null then
    insert into public.raids (guild_id, title, starts_at, ends_at, idempotency_key)
    values (g_id, 'Friday Night: Into the Citadel', now(), now(), 'seed:ready-check:citadel')
    returning id into r_id;
  end if;
  update public.raids set
    guild_id = g_id,
    title = 'Friday Night: Into the Citadel',
    content = 'Friendly progression; newcomers welcome if prepared.',
    starts_at = (d + time '20:00') at time zone tz,
    ends_at = (d + time '23:00') at time zone tz,
    invites_at = (d + time '19:45') at time zone tz,
    time_zone = tz,
    notes = 'Bring consumables. Let the leader know if you''ll be late. Standby does not mean a guaranteed place.',
    req_tanks = 2, req_healers = 4, req_damage = 14,
    status = 'planned'
  where id = r_id;

  delete from public.proposed_actions where raid_id = r_id;
  delete from public.alerts where raid_id = r_id;
  delete from public.signups where raid_id = r_id and seed_key is not null;
  -- A mapped real account cannot also hold a separate signup in this raid.
  delete from public.signups s using public.demo_seed_mappings m
    where s.raid_id = r_id and m.raid_id = r_id and s.user_id = m.user_id and s.seed_key is null;

  insert into public.signups (raid_id, seed_key, player_name, character_name, class_name, role, status,
    availability_start, availability_end, availability_note, contact_ok, switch_offers, switch_note, note)
  select r_id, v.k, v.p, v.c, v.cl, v.role::public.raid_role, v.st::public.signup_status,
    case when v.a1 is null then null else (d + v.a1::time) at time zone tz end,
    case when v.a2 is null then null else (d + v.a2::time) at time zone tz end,
    v.an, v.ok, v.sw::public.raid_role[], v.swn, v.n
  from (values
    ('morgan','Morgan','Ironward','Warrior','tank','confirmed',null,null,'',null,'{}','',''),
    ('priya','Priya','Dawnshield','Paladin','tank','confirmed',null,null,'',null,'{}','',''),
    ('alex','Alex','Mosslight','Druid','healer','confirmed',null,null,'',null,'{}','',''),
    ('beth','Beth','Silverhymn','Priest','healer','confirmed',null,null,'',null,'{}','',''),
    ('callum','Callum','Raincaller','Shaman','healer','confirmed',null,null,'',null,'{}','',''),
    ('dina','Dina','Mistpetal','Monk','healer','confirmed',null,null,'',null,'{}','',''),
    ('elliot','Elliot','Emberquill','Mage','damage','confirmed',null,null,'',null,'{}','',''),
    ('freya','Freya','Nightstring','Hunter','damage','confirmed',null,null,'',null,'{}','',''),
    ('george','George','Ashpact','Warlock','damage','confirmed',null,null,'',null,'{}','',''),
    ('hana','Hana','Quietblade','Rogue','damage','confirmed',null,null,'',null,'{}','',''),
    ('isaac','Isaac','Frostgrave','Death Knight','damage','confirmed',null,null,'',null,'{}','',''),
    ('jess','Jess','Starbough','Druid','damage','confirmed',null,null,'',true,'{healer}','Explicitly offered to switch from damage to healer if asked. Switching would leave a damage vacancy that needs its own cover.',''),
    ('kai','Kai','Riftstep','Demon Hunter','damage','confirmed',null,null,'',null,'{}','',''),
    ('leah','Leah','Stormbite','Shaman','damage','confirmed',null,null,'',null,'{}','',''),
    ('max','Max','Brightsteel','Paladin','damage','confirmed',null,null,'',null,'{}','Class can tank, but Max has NOT offered to switch for this event. Class capability is not permission.',''),
    ('nia','Nia','Duskprayer','Priest','damage','confirmed',null,null,'',null,'{}','',''),
    ('owen','Owen','Cinderwing','Evoker','damage','confirmed',null,null,'',null,'{}','',''),
    ('poppy','Poppy','Wildarrow','Hunter','damage','confirmed',null,null,'',null,'{}','',''),
    ('ravi','Ravi','Runeflare','Mage','damage','confirmed',null,null,'',null,'{}','',''),
    ('sofia','Sofia','Redfang','Warrior','damage','confirmed',null,null,'',null,'{}','',''),
    ('sam','Sam','Brookmender','Shaman','healer','standby','19:45','23:00','Happy to be contacted for a healer vacancy. Must accept a promotion before joining the confirmed roster.',true,'{}','',''),
    ('taylor','Taylor','Lightkeeper','Paladin','healer','standby','21:00','23:00','Available only from 21:00. Cannot cover the start of the raid.',true,'{}','',''),
    ('uma','Uma','Granitepaw','Druid','tank','standby','19:45','23:00','Willing tank reserve.',true,'{}','',''),
    ('victor','Victor','Spellwake','Mage','damage','standby','19:45','23:00','Willing damage reserve.',true,'{}','',''),
    ('wren','Wren','Foxtrail','Hunter','damage','standby','20:00','22:00','Available 20:00–22:00 only. Cannot cover the full raid.',true,'{}','',''),
    ('yusuf','Yusuf','Shadebrand','Warlock','damage','standby','19:45','23:00','Willing damage reserve.',true,'{}','',''),
    ('zara','Zara','Moonbrook','Druid','healer','tentative',null,null,'Might be available; will confirm by 18:00 on raid day.',null,'{}','',''),
    ('ben','Ben','Stoneguard','Warrior','tank','tentative',null,null,'Work may run late. No confirmed arrival time.',null,'{}','',''),
    ('chloe','Chloe','Sunthread','Priest','healer','unavailable',null,null,'Away this Friday. Do not contact as a replacement.',false,'{}','',''),
    ('dev','Dev','Felwhisper','Warlock','damage','unavailable',null,null,'Cannot attend.',false,'{}','',''),
    ('erin','Erin','Snowglyph','Mage','damage','no_response',null,null,'No response yet.',null,'{}','',''),
    ('finn','Finn','Oakwarden','Druid','tank','no_response',null,null,'No response yet.',null,'{}','','')
  ) as v(k,p,c,cl,role,st,a1,a2,an,ok,sw,swn,n);

  -- Re-apply real-account mappings (e.g. the signed-in demo player as Alex).
  update public.signups s set user_id = m.user_id, character_id = m.character_id
  from public.demo_seed_mappings m
  where s.raid_id = r_id and m.raid_id = r_id and s.seed_key = m.seed_key;

  perform set_config('raidnight.seeding', 'off', true);
  return r_id;
end;
$$;
revoke execute on function public._seed_ready_check() from anon, authenticated, public;

create or replace function public.reset_ready_check_demo()
returns uuid language plpgsql security definer set search_path = public as $$
declare g_id uuid;
begin
  select id into g_id from public.guilds where demo_scenario = 'ready_check';
  if g_id is null or not public.is_guild_leader(g_id) then
    raise exception 'only a leader of The Ready Check can reset the demo';
  end if;
  insert into public.audit_log (guild_id, actor_id, action, entity)
  values (g_id, auth.uid(), 'demo_reset', 'raid');
  return public._seed_ready_check();
end;
$$;
revoke execute on function public.reset_ready_check_demo() from anon, public;
grant execute on function public.reset_ready_check_demo() to authenticated;

-- Let a signed-in member play a seeded demo player with their own real character.
create or replace function public.claim_demo_participant(_raid_id uuid, _seed_key text, _character_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g_id uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select r.guild_id into g_id from public.raids r join public.guilds g on g.id = r.guild_id
    where r.id = _raid_id and g.demo_scenario = 'ready_check';
  if g_id is null or not public.is_guild_member(g_id) then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.characters where id = _character_id and user_id = uid and guild_id = g_id) then
    raise exception 'character must be your own in this guild';
  end if;
  if exists (select 1 from public.demo_seed_mappings where raid_id = _raid_id and seed_key = _seed_key and user_id <> uid) then
    raise exception 'that demo player is already mapped to someone else';
  end if;
  delete from public.demo_seed_mappings where raid_id = _raid_id and user_id = uid and seed_key <> _seed_key;
  insert into public.demo_seed_mappings (raid_id, seed_key, user_id, character_id)
  values (_raid_id, _seed_key, uid, _character_id)
  on conflict (raid_id, seed_key) do update set character_id = excluded.character_id;
  perform set_config('raidnight.seeding', 'on', true);
  update public.signups set user_id = null, character_id = null
    where raid_id = _raid_id and user_id = uid and seed_key is not null and seed_key <> _seed_key;
  delete from public.signups where raid_id = _raid_id and user_id = uid and seed_key is null;
  update public.signups set user_id = uid, character_id = _character_id
    where raid_id = _raid_id and seed_key = _seed_key;
  perform set_config('raidnight.seeding', 'off', true);
end;
$$;
revoke execute on function public.claim_demo_participant(uuid, text, uuid) from anon, public;
grant execute on function public.claim_demo_participant(uuid, text, uuid) to authenticated;

-- The first person to join a leaderless demo guild becomes its leader.
create or replace function public.join_guild_by_invite(_invite_code text, _display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  g public.guilds;
  uid uuid := auth.uid();
  new_role public.guild_role := 'member';
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into g from public.guilds where invite_code = upper(trim(_invite_code));
  if not found then raise exception 'invalid invite code'; end if;
  if g.is_demo and not exists (select 1 from public.memberships where guild_id = g.id and role = 'leader') then
    new_role := 'leader';
  end if;
  insert into public.memberships (guild_id, user_id, role, display_name)
  values (g.id, uid, new_role, coalesce(nullif(trim(_display_name), ''), 'Adventurer'))
  on conflict (guild_id, user_id) do nothing;
  return g.id;
end;
$$;

select public._seed_ready_check();