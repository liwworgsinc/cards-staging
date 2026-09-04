-- LIW Cards staging — keep Music artist identity consistent across every save path.
-- Stage name/genre are canonical fallbacks for Music cards only.

create or replace function public.save_artist_settings(p_card_id uuid, p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_owner uuid;
  v_settings jsonb := coalesce(p_settings, '{}'::jsonb);
  v_previous_settings jsonb := '{}'::jsonb;
  v_current_name text;
  v_current_title text;
  v_new_stage text;
  v_new_genre text;
begin
  if jsonb_typeof(v_settings) <> 'object' or octet_length(v_settings::text) > 20000 then
    raise exception 'Artist settings must be a JSON object smaller than 20 KB';
  end if;

  v_new_stage := nullif(btrim(v_settings->>'stage_name'), '');
  v_new_genre := nullif(btrim(v_settings->>'genre'), '');

  select dc.user_id,
         coalesce(dc.artist_settings, '{}'::jsonb),
         dc.full_name,
         dc.job_title
    into v_owner, v_previous_settings, v_current_name, v_current_title
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
      full_name = case
        when v_new_stage is not null and (
          v_current_name is null
          or btrim(v_current_name) = ''
          or lower(btrim(v_current_name)) = 'untitled card'
          or (
            nullif(btrim(v_previous_settings->>'stage_name'), '') is not null
            and btrim(v_current_name) = btrim(v_previous_settings->>'stage_name')
          )
        ) then v_new_stage
        else full_name
      end,
      job_title = case
        when v_new_genre is not null and (
          v_current_title is null
          or btrim(v_current_title) = ''
          or (
            nullif(btrim(v_previous_settings->>'genre'), '') is not null
            and btrim(v_current_title) = btrim(v_previous_settings->>'genre')
          )
        ) then v_new_genre
        else job_title
      end,
      updated_at = now()
  where id = p_card_id;

  return v_settings;
end
$function$;

revoke execute on function public.save_artist_settings(uuid,jsonb) from public;
revoke execute on function public.save_artist_settings(uuid,jsonb) from anon;
grant execute on function public.save_artist_settings(uuid,jsonb) to authenticated;

create or replace function public.protect_music_card_identity()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_stage_name text;
  v_genre text;
begin
  if lower(coalesce(new.card_experience, '')) = 'music' then
    v_stage_name := nullif(btrim(coalesce(new.artist_settings->>'stage_name', '')), '');
    v_genre := nullif(btrim(coalesce(new.artist_settings->>'genre', '')), '');

    if v_stage_name is not null and (
      new.full_name is null
      or btrim(new.full_name) = ''
      or lower(btrim(new.full_name)) = 'untitled card'
    ) then
      new.full_name := v_stage_name;
    end if;

    if v_genre is not null and (
      new.job_title is null
      or btrim(new.job_title) = ''
    ) then
      new.job_title := v_genre;
    end if;
  end if;

  return new;
end
$function$;

drop trigger if exists protect_music_card_identity_on_write on public.digital_cards;
create trigger protect_music_card_identity_on_write
before insert or update on public.digital_cards
for each row
execute function public.protect_music_card_identity();
