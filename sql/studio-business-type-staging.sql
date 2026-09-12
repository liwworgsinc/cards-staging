-- LIW Cards staging: broaden the internal barbershop experience into customer-facing Studio.
-- The internal card_experience value remains `barbershop` for backward compatibility.

alter table public.digital_cards
  add column if not exists studio_business_type text not null default 'barber';

alter table public.digital_cards
  drop constraint if exists digital_cards_studio_business_type_check;

alter table public.digital_cards
  add constraint digital_cards_studio_business_type_check
  check (studio_business_type in ('barber','hair','nails','lashes','makeup','esthetician','spa','cosmetics'));

comment on column public.digital_cards.studio_business_type is
  'Studio experience business subtype. Internal card_experience remains barbershop for backward compatibility.';

create or replace function public.set_studio_business_type(p_card_id uuid, p_business_type text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text := lower(btrim(coalesce(p_business_type, '')));
  v_user uuid := auth.uid();
  v_owner uuid;
begin
  if v_type not in ('barber','hair','nails','lashes','makeup','esthetician','spa','cosmetics') then
    raise exception 'Unsupported Studio business type';
  end if;

  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select dc.user_id into v_owner
  from public.digital_cards dc
  where dc.id = p_card_id;

  if v_owner is null then
    raise exception 'Card not found';
  end if;

  if not (
    v_owner = v_user
    or public.is_admin()
    or public.has_workspace_access(v_owner, true)
  ) then
    raise exception 'You do not have permission to edit this card';
  end if;

  update public.digital_cards
  set studio_business_type = v_type,
      updated_at = now()
  where id = p_card_id;

  return v_type;
end;
$$;

revoke all on function public.set_studio_business_type(uuid, text) from public;
grant execute on function public.set_studio_business_type(uuid, text) to authenticated;

create or replace function public.public_studio_business_type(p_card_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select dc.studio_business_type
  from public.digital_cards dc
  where dc.id = p_card_id
    and (
      (dc.status = 'published' and public.card_is_within_current_limit(dc.id))
      or dc.user_id = (select auth.uid())
      or public.has_workspace_access(dc.user_id, false)
      or public.is_admin()
    )
  limit 1
$$;

revoke all on function public.public_studio_business_type(uuid) from public;
grant execute on function public.public_studio_business_type(uuid) to anon, authenticated;
