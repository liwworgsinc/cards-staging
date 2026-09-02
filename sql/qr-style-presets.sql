-- LIW Cards staging: persistent scan-safe QR pattern presets.

alter table public.digital_cards
  add column if not exists qr_style text not null default 'classic';

alter table public.digital_cards
  drop constraint if exists digital_cards_qr_style_check;

alter table public.digital_cards
  add constraint digital_cards_qr_style_check
  check (qr_style in ('classic','rounded','dots','luxe','bold','liw_signature'));

create or replace function public.set_card_qr_style(p_card_id uuid, p_style text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_style text;
begin
  v_style := case
    when lower(coalesce(p_style, 'classic')) in ('classic','rounded','dots','luxe','bold','liw_signature')
      then lower(coalesce(p_style, 'classic'))
    else 'classic'
  end;

  select dc.user_id into v_owner
  from public.digital_cards dc
  where dc.id = p_card_id;

  if v_owner is null then
    raise exception 'Card not found';
  end if;

  if v_owner <> (select auth.uid())
     and not public.is_admin()
     and not exists (
       select 1
       from public.workspace_members wm
       where wm.owner_user_id = v_owner
         and wm.member_user_id = (select auth.uid())
         and wm.status = 'active'
         and wm.role = 'editor'
     ) then
    raise exception 'You do not have permission to edit this card';
  end if;

  if v_style <> 'classic' and not public.user_has_entitlement(v_owner, 'custom_qr') then
    raise exception 'Custom QR styles require Custom QR access';
  end if;

  update public.digital_cards
  set qr_style = v_style,
      updated_at = now()
  where id = p_card_id;

  return v_style;
end;
$$;

revoke all on function public.set_card_qr_style(uuid, text) from public;
grant execute on function public.set_card_qr_style(uuid, text) to authenticated;

create or replace function public.public_card_qr_style(p_slug text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.user_has_entitlement(dc.user_id, 'custom_qr')
      then coalesce(dc.qr_style, 'classic')
    else 'classic'
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
$$;

revoke all on function public.public_card_qr_style(text) from public;
grant execute on function public.public_card_qr_style(text) to anon, authenticated;
