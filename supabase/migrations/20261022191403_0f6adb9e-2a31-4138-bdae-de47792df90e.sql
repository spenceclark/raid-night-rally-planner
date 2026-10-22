alter table public.alerts add column webhook_notified_at timestamptz;

create or replace function public.join_guild_by_invite(_invite_code text, _display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  g public.guilds;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select * into g from public.guilds where invite_code = upper(trim(_invite_code));
  if not found then
    raise exception 'invalid invite code';
  end if;
  insert into public.memberships (guild_id, user_id, role, display_name)
  values (g.id, uid, 'member', coalesce(nullif(trim(_display_name), ''), 'Adventurer'))
  on conflict (guild_id, user_id) do nothing;
  return g.id;
end;
$$;
revoke execute on function public.join_guild_by_invite(text, text) from anon, public;
grant execute on function public.join_guild_by_invite(text, text) to authenticated;