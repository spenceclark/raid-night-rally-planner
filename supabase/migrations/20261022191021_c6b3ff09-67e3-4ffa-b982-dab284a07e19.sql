create type public.guild_role as enum ('leader','member');
create type public.raid_role as enum ('tank','healer','damage');
create type public.signup_status as enum ('confirmed','tentative','unavailable','standby');
create type public.alert_status as enum ('recorded','retrieved','delivered');

create table public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,8),
  is_demo boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.guilds to authenticated;
grant all on public.guilds to service_role;

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null,
  role public.guild_role not null default 'member',
  display_name text not null default '',
  created_at timestamptz not null default now(),
  unique (guild_id, user_id)
);
grant select, insert, update, delete on public.memberships to authenticated;
grant all on public.memberships to service_role;

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null,
  name text not null,
  class_name text not null default '',
  roles public.raid_role[] not null default '{}',
  willing_to_switch boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.characters to authenticated;
grant all on public.characters to service_role;

create table public.raids (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  title text not null,
  content text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  time_zone text not null default 'UTC',
  notes text not null default '',
  req_tanks int not null default 2,
  req_healers int not null default 2,
  req_damage int not null default 6,
  status text not null default 'planned',
  idempotency_key text unique,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.raids to authenticated;
grant all on public.raids to service_role;

create table public.signups (
  id uuid primary key default gen_random_uuid(),
  raid_id uuid not null references public.raids(id) on delete cascade,
  user_id uuid not null,
  character_id uuid references public.characters(id) on delete set null,
  role public.raid_role not null,
  status public.signup_status not null default 'confirmed',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (raid_id, user_id)
);
grant select, insert, update, delete on public.signups to authenticated;
grant all on public.signups to service_role;

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  raid_id uuid not null references public.raids(id) on delete cascade,
  signup_id uuid,
  kind text not null default 'role_gap',
  message text not null,
  dedupe_key text not null unique,
  status public.alert_status not null default 'recorded',
  created_at timestamptz not null default now()
);
grant select, update on public.alerts to authenticated;
grant all on public.alerts to service_role;

create table public.proposed_actions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  raid_id uuid not null references public.raids(id) on delete cascade,
  alert_id uuid references public.alerts(id) on delete cascade,
  proposal text not null,
  status text not null default 'pending',
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.proposed_actions to authenticated;
grant all on public.proposed_actions to service_role;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid references public.guilds(id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity text not null default '',
  entity_id uuid,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;

-- Membership helpers (security definer to avoid RLS recursion)
create or replace function public.is_guild_member(_guild_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships where guild_id = _guild_id and user_id = auth.uid())
$$;
create or replace function public.is_guild_leader(_guild_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships where guild_id = _guild_id and user_id = auth.uid() and role = 'leader')
$$;
grant execute on function public.is_guild_member(uuid) to authenticated;
grant execute on function public.is_guild_leader(uuid) to authenticated;

alter table public.guilds enable row level security;
create policy "members can view their guilds" on public.guilds for select to authenticated using (public.is_guild_member(id));
create policy "signed-in users can create guilds" on public.guilds for insert to authenticated with check (created_by = auth.uid());
create policy "leaders can update their guild" on public.guilds for update to authenticated using (public.is_guild_leader(id));

alter table public.memberships enable row level security;
create policy "members can view fellow members" on public.memberships for select to authenticated using (public.is_guild_member(guild_id));
create policy "users join guilds themselves" on public.memberships for insert to authenticated with check (user_id = auth.uid());
create policy "leaders manage memberships" on public.memberships for update to authenticated using (public.is_guild_leader(guild_id));
create policy "leaders or self can remove membership" on public.memberships for delete to authenticated using (public.is_guild_leader(guild_id) or user_id = auth.uid());

alter table public.characters enable row level security;
create policy "members view guild characters" on public.characters for select to authenticated using (public.is_guild_member(guild_id));
create policy "members add own characters" on public.characters for insert to authenticated with check (user_id = auth.uid() and public.is_guild_member(guild_id));
create policy "members edit own characters" on public.characters for update to authenticated using (user_id = auth.uid());
create policy "members delete own characters" on public.characters for delete to authenticated using (user_id = auth.uid());

alter table public.raids enable row level security;
create policy "members view guild raids" on public.raids for select to authenticated using (public.is_guild_member(guild_id));
create policy "leaders create raids" on public.raids for insert to authenticated with check (public.is_guild_leader(guild_id));
create policy "leaders update raids" on public.raids for update to authenticated using (public.is_guild_leader(guild_id));
create policy "leaders delete raids" on public.raids for delete to authenticated using (public.is_guild_leader(guild_id));

alter table public.signups enable row level security;
create policy "members view guild signups" on public.signups for select to authenticated using (exists (select 1 from public.raids r where r.id = raid_id and public.is_guild_member(r.guild_id)));
create policy "members create own signup" on public.signups for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.raids r where r.id = raid_id and public.is_guild_member(r.guild_id)));
create policy "members update own signup" on public.signups for update to authenticated using (user_id = auth.uid());
create policy "members delete own signup" on public.signups for delete to authenticated using (user_id = auth.uid());

alter table public.alerts enable row level security;
create policy "members view guild alerts" on public.alerts for select to authenticated using (public.is_guild_member(guild_id));
create policy "leaders update alerts" on public.alerts for update to authenticated using (public.is_guild_leader(guild_id));

alter table public.proposed_actions enable row level security;
create policy "members view proposed actions" on public.proposed_actions for select to authenticated using (public.is_guild_member(guild_id));
create policy "leaders create proposed actions" on public.proposed_actions for insert to authenticated with check (public.is_guild_leader(guild_id));
create policy "leaders decide proposed actions" on public.proposed_actions for update to authenticated using (public.is_guild_leader(guild_id));

alter table public.audit_log enable row level security;
create policy "members view guild audit log" on public.audit_log for select to authenticated using (public.is_guild_member(guild_id));

-- Confirmed-cancellation alert trigger: recalculates the confirmed roster and
-- records a persistent, deduplicated alert when a role drops below requirement.
create or replace function public.handle_confirmed_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_row public.signups;
  r public.raids;
  req_count int;
  confirmed_count int;
  dkey text;
begin
  if tg_op = 'DELETE' then
    old_row := old;
  else
    old_row := old;
    if new.status = 'confirmed' then
      return new;
    end if;
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

create trigger signup_confirmed_cancel_update after update on public.signups for each row execute function public.handle_confirmed_cancel();
create trigger signup_confirmed_cancel_delete after delete on public.signups for each row execute function public.handle_confirmed_cancel();

-- Realtime for signups and alerts
alter publication supabase_realtime add table public.signups;
alter publication supabase_realtime add table public.alerts;

-- Optional fictional demo guild with a sample raid (no members; join via invite code)
insert into public.guilds (name, invite_code, is_demo)
values ('The Gilded Gryphon (Demo)', 'DEMO-RAID', true);

insert into public.raids (guild_id, title, content, starts_at, ends_at, time_zone, notes, req_tanks, req_healers, req_damage)
select id, 'Molten Depths — Heroic', 'Heroic clear of the Molten Depths, bosses 1-8.',
  now() + interval '3 days', now() + interval '3 days' + interval '3 hours', 'UTC',
  'Bring flasks and enchants. Demo raid for the fictional guild.', 2, 2, 6
from public.guilds where invite_code = 'DEMO-RAID';