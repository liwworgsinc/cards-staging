-- LIW Cards staging-only booking confirmation email outbox.
-- Public clients never receive direct table privileges. The Edge Function
-- validates a private booking token, checks source_environment='staging',
-- and sends only to the persisted booking email.
create table if not exists public.booking_confirmation_delivery_staging(
  appointment_id uuid primary key references public.booking_appointments(id) on delete cascade,
  status text not null check(status in ('sending','sent','failed')),
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_id text,
  last_error text,
  updated_at timestamptz not null default now()
);
alter table public.booking_confirmation_delivery_staging enable row level security;
revoke all on table public.booking_confirmation_delivery_staging from public,anon,authenticated;
grant select,insert,update,delete on public.booking_confirmation_delivery_staging to service_role;
comment on table public.booking_confirmation_delivery_staging is 'Staging-only idempotent confirmation email claims; service role only.';
