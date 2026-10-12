-- Staging-only Super Studio public payload authority.
-- Draft/editor preview and published/public rendering consume one payload shape.

create or replace function public.public_super_studio_payload_staging(p_card_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_status text;
  v_allowed boolean := false;
  v_payload jsonb;
begin
  select dc.user_id, dc.status
    into v_owner, v_status
  from public.digital_cards dc
  where dc.id = p_card_id;

  if v_owner is null then
    return null;
  end if;

  v_allowed :=
    (v_status = 'published' and public.card_is_within_current_limit(p_card_id))
    or v_owner = (select auth.uid())
    or public.has_workspace_access(v_owner, false)
    or public.is_admin()
    or public.designer_has_card_access(p_card_id, false);

  if not v_allowed then
    return null;
  end if;

  select jsonb_build_object(
    'state', coalesce((
      select s.data
      from public.super_studio_state_staging s
      where s.card_id = p_card_id
      limit 1
    ), '{}'::jsonb),
    'services', coalesce((
      select jsonb_agg(to_jsonb(cs) order by cs.sort_order, cs.id)
      from public.card_services cs
      where cs.card_id = p_card_id
        and cs.is_enabled = true
    ), '[]'::jsonb),
    'socials', coalesce((
      select jsonb_agg(to_jsonb(sl) order by sl.sort_order, sl.id)
      from public.social_links sl
      where sl.card_id = p_card_id
        and sl.is_enabled = true
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(to_jsonb(cp) order by cp.sort_order, cp.id)
      from public.card_products cp
      where cp.card_id = p_card_id
        and cp.is_enabled = true
    ), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$$;

grant execute on function public.public_super_studio_payload_staging(uuid) to anon, authenticated;
