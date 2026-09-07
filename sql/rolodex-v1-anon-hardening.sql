-- LIW Rolodex V1 authenticated-only RPC hardening
-- Applied after the initial V1 migration during staging verification.
revoke execute on function public.rolodex_save_liw_card(text) from public;
revoke execute on function public.rolodex_save_liw_card(text) from anon;
revoke execute on function public.rolodex_list_entries() from public;
revoke execute on function public.rolodex_list_entries() from anon;
grant execute on function public.rolodex_save_liw_card(text) to authenticated;
grant execute on function public.rolodex_list_entries() to authenticated;