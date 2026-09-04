-- LIW Cards staging — isolated Music Artist Dressing Room settings.
-- Classic and Flow do not read this object.

alter table public.digital_cards
  add column if not exists artist_settings jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'digital_cards_artist_settings_object_check'
  ) then
    alter table public.digital_cards
      add constraint digital_cards_artist_settings_object_check
      check (jsonb_typeof(artist_settings) = 'object' and octet_length(artist_settings::text) <= 20000);
  end if;
end $$;

create or replace function public.public_artist_settings_by_slug(p_slug text)
returns jsonb
language sql
stable security definer
set search_path to ''
as $function$
  select case
    when dc.card_experience = 'music' then coalesce(dc.artist_settings, '{}'::jsonb)
    else '{}'::jsonb
  end
  from public.digital_cards dc
  where dc.slug = lower(btrim(p_slug))
    and (
      (dc.status = 'published' and public.card_is_within_current_limit(dc.id))
      or dc.user_id = (select auth.uid())
      or public.has_workspace_access(dc.user_id, false)
      or public.is_admin()
    )
  limit 1
$function$;

grant execute on function public.public_artist_settings_by_slug(text) to anon, authenticated;

create or replace function public.save_artist_settings(p_card_id uuid, p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_owner uuid;
  v_settings jsonb := coalesce(p_settings, '{}'::jsonb);
begin
  if jsonb_typeof(v_settings) <> 'object' or octet_length(v_settings::text) > 20000 then
    raise exception 'Artist settings must be a JSON object smaller than 20 KB';
  end if;

  select dc.user_id into v_owner
  from public.digital_cards dc
  where dc.id = p_card_id;

  if v_owner is null then
    raise exception 'Card not found';
  end if;

  if not (
    v_owner = (select auth.uid())
    or public.is_admin()
    or exists (
      select 1
      from public.workspace_members wm
      where wm.owner_user_id = v_owner
        and wm.member_user_id = (select auth.uid())
        and wm.status = 'active'
        and wm.role = 'editor'
    )
  ) then
    raise exception 'You do not have permission to edit this card';
  end if;

  update public.digital_cards
  set artist_settings = v_settings,
      updated_at = now()
  where id = p_card_id;

  return v_settings;
end
$function$;

grant execute on function public.save_artist_settings(uuid,jsonb) to authenticated;
