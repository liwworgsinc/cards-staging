create table if not exists public.staging_promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  currency text not null default 'usd',
  active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  per_customer_limit integer not null default 1 check (per_customer_limit > 0),
  applicable_plans text[] not null default '{}'::text[],
  stripe_coupon_id text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staging_promo_value_check check (
    (discount_type='percent' and discount_value <= 100) or discount_type='fixed'
  )
);

create unique index if not exists staging_promo_codes_code_upper_idx
  on public.staging_promo_codes (upper(code));

create table if not exists public.staging_promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.staging_promo_codes(id) on delete cascade,
  user_id uuid not null,
  plan_key text not null,
  billing_interval text not null,
  checkout_session_id text,
  status text not null default 'reserved' check (status in ('reserved','completed','canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staging_promo_redemptions_session_idx
  on public.staging_promo_redemptions(checkout_session_id)
  where checkout_session_id is not null;
create index if not exists staging_promo_redemptions_promo_status_idx
  on public.staging_promo_redemptions(promo_id,status);
create index if not exists staging_promo_redemptions_user_idx
  on public.staging_promo_redemptions(promo_id,user_id,status);

alter table public.staging_promo_codes enable row level security;
alter table public.staging_promo_redemptions enable row level security;
