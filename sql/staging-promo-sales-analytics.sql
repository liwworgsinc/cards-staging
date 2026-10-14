alter table public.staging_promo_redemptions
  add column if not exists stripe_checkout_status text,
  add column if not exists stripe_payment_status text,
  add column if not exists stripe_subscription_id text,
  add column if not exists amount_subtotal integer,
  add column if not exists amount_discount integer,
  add column if not exists amount_total integer,
  add column if not exists currency text,
  add column if not exists completed_at timestamptz,
  add column if not exists last_synced_at timestamptz;

create table if not exists public.staging_promo_events (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.staging_promo_codes(id) on delete cascade,
  event_type text not null check (event_type in ('visit','applied')),
  visitor_id text not null check (char_length(visitor_id) between 8 and 96),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing_path text,
  created_at timestamptz not null default now(),
  unique (promo_id, event_type, visitor_id)
);

create index if not exists staging_promo_events_promo_type_idx
  on public.staging_promo_events(promo_id,event_type,created_at desc);

alter table public.staging_promo_events enable row level security;
