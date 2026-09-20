-- LIW Cards Promotion Pages control center (staging-first)
create table if not exists public.promotion_pages (
  id uuid primary key default gen_random_uuid(),
  environment text not null default 'staging' check (environment in ('staging','production')),
  page_key text not null check (page_key ~ '^[a-z0-9-]+$'),
  label text not null,
  public_path text not null,
  page_title text not null,
  meta_description text not null default '',
  h1 text not null default '',
  demo_card_url text not null default '',
  demo_button_text text not null default 'Open live demo',
  primary_cta_text text not null default 'Build free',
  primary_cta_url text not null default '',
  is_published boolean not null default true,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (environment, page_key)
);

alter table public.promotion_pages enable row level security;

revoke all on public.promotion_pages from anon;
grant select, insert, update, delete on public.promotion_pages to authenticated;

drop policy if exists promotion_pages_admin_select on public.promotion_pages;
create policy promotion_pages_admin_select on public.promotion_pages
for select to authenticated using ((select public.is_admin()));

drop policy if exists promotion_pages_admin_insert on public.promotion_pages;
create policy promotion_pages_admin_insert on public.promotion_pages
for insert to authenticated with check ((select public.is_admin()));

drop policy if exists promotion_pages_admin_update on public.promotion_pages;
create policy promotion_pages_admin_update on public.promotion_pages
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists promotion_pages_admin_delete on public.promotion_pages;
create policy promotion_pages_admin_delete on public.promotion_pages
for delete to authenticated using ((select public.is_admin()));

create index if not exists promotion_pages_environment_idx
  on public.promotion_pages (environment, page_key);

insert into public.promotion_pages
(environment,page_key,label,public_path,page_title,meta_description,h1,demo_card_url,demo_button_text,primary_cta_text,primary_cta_url,is_published)
values
('staging','realtors','Realtors','digital-business-card-for-realtors.html','Digital Business Card for Realtors | LIW Cards','Create a digital business card for realtors and real estate agents with QR sharing, contact saving, listing links and business tools. Start free.','A digital business card for realtors that keeps every open-house connection within reach.','https://cards.liwworgs.com/card.html?slug=latoya-rapid','Open Latoya Rapid demo','Build my realtor card','',true),
('staging','barbers','Barbers','digital-business-card-for-barbers.html','Digital Business Card for Barbers | LIW Cards','Create a digital business card for barbers with QR sharing, booking links, contact saving, services and social links.','','','Open live demo','Build my barber card','',true),
('staging','artists','Artists & creators','digital-business-card-for-artists.html','Showtime Digital Card for Artists, Creators & Performers | LIW Cards','Build a Showtime digital card for artists, creators and performers with booking, media, social and audience-focused tools.','','','Open live demo','Build my Showtime card','',true),
('staging','nail-artists','Nail artists','digital-business-card-for-nail-artists.html','Digital Business Card for Nail Artists | LIW Cards','Create a digital business card for nail artists with booking links, portfolio sharing, services, contact saving and QR sharing.','','','Open live demo','Build my nail artist card','',true),
('staging','mechanics','Mechanics','digital-business-card-for-mechanics.html','Digital Business Card for Mechanics | LIW Cards','Create a digital business card for mechanics and mobile auto pros with service links, contact actions, location details and QR sharing.','','','Open live demo','Build my mechanic card','',true),
('staging','restaurants','Restaurants','digital-business-card-for-restaurants.html','Digital Business Card for Restaurants | LIW Cards','Create a digital business card for restaurants with menu, ordering, reservation, location, social and contact links in one place.','','','Open live demo','Build my restaurant card','',true)
on conflict (environment,page_key) do nothing;

create or replace function public.public_promotion_page(
  p_page_key text,
  p_environment text default 'production'
)
returns jsonb
language sql
stable
security definer
set search_path='public'
as $$
  select coalesce((
    select jsonb_build_object(
      'page_key', p.page_key,
      'label', p.label,
      'public_path', p.public_path,
      'page_title', p.page_title,
      'meta_description', p.meta_description,
      'h1', p.h1,
      'demo_card_url', p.demo_card_url,
      'demo_button_text', p.demo_button_text,
      'primary_cta_text', p.primary_cta_text,
      'primary_cta_url', p.primary_cta_url,
      'is_published', p.is_published,
      'updated_at', p.updated_at
    )
    from public.promotion_pages p
    where p.page_key = p_page_key
      and p.environment = p_environment
    limit 1
  ), '{}'::jsonb)
$$;

revoke all on function public.public_promotion_page(text,text) from public;
grant execute on function public.public_promotion_page(text,text) to anon, authenticated;
