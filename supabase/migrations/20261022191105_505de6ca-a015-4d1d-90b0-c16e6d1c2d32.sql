revoke execute on function public.is_guild_member(uuid) from anon, public;
revoke execute on function public.is_guild_leader(uuid) from anon, public;
revoke execute on function public.handle_confirmed_cancel() from anon, authenticated, public;