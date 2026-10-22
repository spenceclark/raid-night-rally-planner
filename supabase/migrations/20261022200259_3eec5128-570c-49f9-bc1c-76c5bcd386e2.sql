alter type public.signup_status add value if not exists 'no_response';

alter table public.signups alter column user_id drop not null;
alter table public.signups
  add column seed_key text,
  add column player_name text,
  add column character_name text,
  add column class_name text,
  add column availability_start timestamptz,
  add column availability_end timestamptz,
  add column availability_note text not null default '',
  add column contact_ok boolean,
  add column switch_offers public.raid_role[] not null default '{}',
  add column switch_note text not null default '';
create unique index signups_raid_seed_key on public.signups (raid_id, seed_key) where seed_key is not null;

alter table public.raids add column invites_at timestamptz;
alter table public.guilds add column demo_scenario text unique;

create table public.demo_seed_mappings (
  id uuid primary key default gen_random_uuid(),
  raid_id uuid not null references public.raids(id) on delete cascade,
  seed_key text not null,
  user_id uuid not null,
  character_id uuid references public.characters(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (raid_id, seed_key)
);
grant select on public.demo_seed_mappings to authenticated;
grant all on public.demo_seed_mappings to service_role;
alter table public.demo_seed_mappings enable row level security;
create policy "members view demo mappings" on public.demo_seed_mappings for select to authenticated
  using (exists (select 1 from public.raids r where r.id = raid_id and public.is_guild_member(r.guild_id)));