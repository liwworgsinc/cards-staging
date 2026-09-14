alter table public.profiles
  add column if not exists business_name text,
  add column if not exists job_title text,
  add column if not exists phone text,
  add column if not exists website text,
  add column if not exists location text,
  add column if not exists timezone text;

update public.profiles p
set
  full_name = case when nullif(btrim(p.full_name), '') is null then coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), p.full_name) else p.full_name end,
  business_name = coalesce(p.business_name, nullif(btrim(u.raw_user_meta_data->>'liw_business_name'), '')),
  job_title = coalesce(p.job_title, nullif(btrim(u.raw_user_meta_data->>'liw_job_title'), '')),
  phone = coalesce(p.phone, nullif(btrim(u.raw_user_meta_data->>'liw_phone'), '')),
  website = coalesce(p.website, nullif(btrim(u.raw_user_meta_data->>'liw_website'), '')),
  location = coalesce(p.location, nullif(btrim(u.raw_user_meta_data->>'liw_location'), '')),
  timezone = coalesce(p.timezone, nullif(btrim(u.raw_user_meta_data->>'liw_timezone'), ''))
from auth.users u
where u.id = p.id;

create table if not exists public.card_state_versions (
  id bigint generated always as identity primary key,
  card_id uuid not null,
  owner_user_id uuid not null,
  changed_by uuid,
  operation text not null check (operation in ('UPDATE','DELETE')),
  source text not null default 'database_trigger',
  card_state jsonb not null,
  social_links_state jsonb not null default '[]'::jsonb,
  services_state jsonb not null default '[]'::jsonb,
  products_state jsonb not null default '[]'::jsonb,
  sections_state jsonb not null default '[]'::jsonb,
  qr_settings_state jsonb,
  created_at timestamptz not null default now()
);

create index if not exists card_state_versions_card_created_idx
  on public.card_state_versions(card_id, created_at desc);
create index if not exists card_state_versions_owner_created_idx
  on public.card_state_versions(owner_user_id, created_at desc);

alter table public.card_state_versions enable row level security;

drop policy if exists card_state_versions_select_own on public.card_state_versions;
create policy card_state_versions_select_own
on public.card_state_versions
for select
to authenticated
using (owner_user_id = (select auth.uid()) or public.is_admin());

create or replace function public.liw_snapshot_card_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.card_state_versions (
    card_id, owner_user_id, changed_by, operation, source,
    card_state, social_links_state, services_state, products_state,
    sections_state, qr_settings_state
  )
  values (
    old.id,
    old.user_id,
    auth.uid(),
    tg_op,
    'database_trigger',
    to_jsonb(old),
    coalesce((select jsonb_agg(to_jsonb(s) order by s.sort_order, s.id) from public.social_links s where s.card_id = old.id), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(s) order by s.sort_order, s.id) from public.card_services s where s.card_id = old.id), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(p) order by p.sort_order, p.id) from public.card_products p where p.card_id = old.id), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(cs) order by cs.sort_order, cs.id) from public.card_sections cs where cs.card_id = old.id), '[]'::jsonb),
    (select to_jsonb(q) from public.card_qr_settings q where q.card_id = old.id limit 1)
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.liw_snapshot_card_state() from public;

drop trigger if exists liw_snapshot_card_state_before_change on public.digital_cards;
create trigger liw_snapshot_card_state_before_change
before update or delete on public.digital_cards
for each row execute function public.liw_snapshot_card_state();

create table if not exists public.profile_state_versions (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  changed_by uuid,
  operation text not null check (operation in ('UPDATE','DELETE')),
  profile_state jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists profile_state_versions_user_created_idx
  on public.profile_state_versions(user_id, created_at desc);

alter table public.profile_state_versions enable row level security;

drop policy if exists profile_state_versions_select_own on public.profile_state_versions;
create policy profile_state_versions_select_own
on public.profile_state_versions
for select
to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

create or replace function public.liw_snapshot_profile_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profile_state_versions(user_id, changed_by, operation, profile_state)
  values (old.id, auth.uid(), tg_op, to_jsonb(old));

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.liw_snapshot_profile_state() from public;

drop trigger if exists liw_snapshot_profile_state_before_change on public.profiles;
create trigger liw_snapshot_profile_state_before_change
before update or delete on public.profiles
for each row execute function public.liw_snapshot_profile_state();
