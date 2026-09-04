-- LIW Cards staging — Artist Dressing Room save RPC is authenticated-only.
revoke execute on function public.save_artist_settings(uuid,jsonb) from public;
revoke execute on function public.save_artist_settings(uuid,jsonb) from anon;
grant execute on function public.save_artist_settings(uuid,jsonb) to authenticated;
