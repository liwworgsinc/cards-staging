-- LIW Cards Booking / Appointments V1 — staging hardening
-- Remove inherited access to internal helper functions and cover booking foreign keys.

create index if not exists booking_settings_user_id_idx
  on public.booking_settings(user_id);
create index if not exists booking_availability_user_id_idx
  on public.booking_availability(user_id);
create index if not exists booking_service_settings_card_id_idx
  on public.booking_service_settings(card_id);
create index if not exists booking_service_settings_user_id_idx
  on public.booking_service_settings(user_id);
create index if not exists booking_appointments_card_service_id_idx
  on public.booking_appointments(card_service_id)
  where card_service_id is not null;

revoke execute on function public.liw_booking_plan_for_user(uuid) from public, anon, authenticated;
revoke execute on function public.liw_booking_touch_updated_at() from public, anon, authenticated;

-- These four RPCs are deliberately callable from public cards. They validate the
-- published card, owner plan, enabled settings, service limits, availability and
-- double-booking rules before reading or writing booking data.
revoke execute on function public.booking_public_bootstrap(text) from public, anon, authenticated;
revoke execute on function public.booking_available_slots(text,uuid,date) from public, anon, authenticated;
revoke execute on function public.booking_submit_request(text,uuid,text,text,text,timestamptz,text) from public, anon, authenticated;
revoke execute on function public.booking_create_appointment(text,uuid,timestamptz,text,text,text,text) from public, anon, authenticated;
grant execute on function public.booking_public_bootstrap(text) to anon, authenticated;
grant execute on function public.booking_available_slots(text,uuid,date) to anon, authenticated;
grant execute on function public.booking_submit_request(text,uuid,text,text,text,timestamptz,text) to anon, authenticated;
grant execute on function public.booking_create_appointment(text,uuid,timestamptz,text,text,text,text) to anon, authenticated;
