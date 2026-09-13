-- LIW Cards — explicit booking route selection for Appointments V2 staging.
-- Keeps staging route choice separate from the shared digital_cards.booking_url so
-- production behavior is not changed while the feature is being tested.

create table if not exists public.booking_route_settings (
  card_id uuid not null references public.digital_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  environment text not null default 'staging' check (environment in ('staging','production')),
  mode text not null default 'liw' check (mode in ('liw','external')),
  external_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (card_id, environment)
);

create index if not exists booking_route_settings_user_idx
  on public.booking_route_settings(user_id, environment);

alter table public.booking_route_settings enable row level security;

drop policy if exists booking_route_settings_owner_select on public.booking_route_settings;
create policy booking_route_settings_owner_select
  on public.booking_route_settings
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists booking_route_settings_owner_insert on public.booking_route_settings;
create policy booking_route_settings_owner_insert
  on public.booking_route_settings
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.digital_cards c
      where c.id = card_id and c.user_id = auth.uid()
    )
  );

drop policy if exists booking_route_settings_owner_update on public.booking_route_settings;
create policy booking_route_settings_owner_update
  on public.booking_route_settings
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.digital_cards c
      where c.id = card_id and c.user_id = auth.uid()
    )
  );

drop policy if exists booking_route_settings_owner_delete on public.booking_route_settings;
create policy booking_route_settings_owner_delete
  on public.booking_route_settings
  for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.booking_route_settings to authenticated;
revoke all on public.booking_route_settings from anon;

-- Public staging cards use this narrow RPC rather than exposing the route table.
-- Before a card owner explicitly saves a route, preserve today's behavior: an enabled
-- external booking URL stays external; otherwise LIW native booking is preferred.
create or replace function public.booking_public_route_staging(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_card public.digital_cards%rowtype;
  v_route public.booking_route_settings%rowtype;
  v_native_enabled boolean := false;
  v_mode text;
  v_external_url text;
begin
  select * into v_card
  from public.digital_cards
  where slug = trim(p_slug)
    and status = 'published'
  limit 1;

  if v_card.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select coalesce(enabled, false) into v_native_enabled
  from public.booking_settings
  where card_id = v_card.id
  limit 1;
  v_native_enabled := coalesce(v_native_enabled, false);

  select * into v_route
  from public.booking_route_settings
  where card_id = v_card.id
    and environment = 'staging'
  limit 1;

  if v_route.card_id is not null then
    v_mode := v_route.mode;
    v_external_url := nullif(trim(coalesce(v_route.external_url, '')), '');
  else
    v_external_url := nullif(trim(coalesce(v_card.booking_url, '')), '');
    v_mode := case
      when coalesce(v_card.booking_enabled, false) and v_external_url is not null then 'external'
      else 'liw'
    end;
  end if;

  return jsonb_build_object(
    'ok', true,
    'mode', v_mode,
    'external_url', v_external_url,
    'native_enabled', v_native_enabled,
    'explicit', v_route.card_id is not null
  );
end;
$$;

revoke all on function public.booking_public_route_staging(text) from public;
grant execute on function public.booking_public_route_staging(text) to anon, authenticated;
