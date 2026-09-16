-- LIW Cards staging Growth Center persistence
-- Applied to the LIW Digital Cards Supabase project on 2026-09-16.
-- These tables are staging-only and admin-only through the existing public.is_admin() helper.

create table if not exists public.staging_growth_seo_briefs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid(),
  title text not null,
  keyword text not null,
  industry text not null,
  intent text not null,
  brief_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.staging_growth_partners (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid(),
  name text not null,
  partner_type text not null default 'Partner',
  status text not null default 'Prospect',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staging_growth_reviews (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid(),
  customer_name text not null,
  status text not null check (status in ('Ask next','Requested','Received','Declined')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staging_growth_seo_briefs enable row level security;
alter table public.staging_growth_partners enable row level security;
alter table public.staging_growth_reviews enable row level security;

revoke all on public.staging_growth_seo_briefs from anon;
revoke all on public.staging_growth_partners from anon;
revoke all on public.staging_growth_reviews from anon;

grant select, insert, update, delete on public.staging_growth_seo_briefs to authenticated;
grant select, insert, update, delete on public.staging_growth_partners to authenticated;
grant select, insert, update, delete on public.staging_growth_reviews to authenticated;

create policy "staging growth seo admin only"
  on public.staging_growth_seo_briefs
  for all to authenticated
  using ((select is_admin()))
  with check ((select is_admin()));

create policy "staging growth partners admin only"
  on public.staging_growth_partners
  for all to authenticated
  using ((select is_admin()))
  with check ((select is_admin()));

create policy "staging growth reviews admin only"
  on public.staging_growth_reviews
  for all to authenticated
  using ((select is_admin()))
  with check ((select is_admin()));

create index if not exists staging_growth_seo_briefs_created_at_idx
  on public.staging_growth_seo_briefs (created_at desc);
create index if not exists staging_growth_partners_created_at_idx
  on public.staging_growth_partners (created_at desc);
create index if not exists staging_growth_reviews_created_at_idx
  on public.staging_growth_reviews (created_at desc);
