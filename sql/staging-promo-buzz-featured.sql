-- STAGING ONLY: lets Super Admin choose one promo for all LIW Buzz article CTAs.
alter table public.staging_promo_codes
  add column if not exists buzz_featured boolean not null default false;

-- Only one promo can be the LIW Buzz offer at a time.
create unique index if not exists staging_promo_codes_one_buzz_featured_idx
  on public.staging_promo_codes (buzz_featured)
  where buzz_featured = true;
