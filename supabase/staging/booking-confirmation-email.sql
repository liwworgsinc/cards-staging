-- Staging-only LIW Cards booking confirmation delivery claims.
-- Emails are sent by send-booking-confirmation-staging after the saved appointment
-- and its secret manage token both match. No client can choose a recipient.
create table if not exists public.booking_confirmation_deliveries (
  appointment_id uuid primary key references public.booking_appointments(id) on delete cascade,
  state text not null default 'sending' check (state in ('sending','sent','failed')),
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  updated_at timestamptz not null default now()
);
alter table public.booking_confirmation_deliveries enable row level security;
-- This table is intentionally inaccessible to anon and authenticated roles.
-- Only the privileged Edge Function uses service_role to claim/update delivery.
revoke all on public.booking_confirmation_deliveries from public, anon, authenticated;
grant select, insert, update, delete on public.booking_confirmation_deliveries to service_role;
