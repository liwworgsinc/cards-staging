-- LIW Cards: staging-only private management of Realtor property showings.
-- Requires existing staging booking management and Realtor showing RPCs.
-- These functions accept the private booking token and restrict reads/writes to source_environment='staging'.

CREATE OR REPLACE FUNCTION public.realtor_manage_appointment_staging(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  base jsonb; appt public.booking_appointments%rowtype;
  listing public.realtor_listings%rowtype;
  listing_text text;
begin
  base:=public.booking_manage_lookup_staging_v3(p_token);
  if coalesce((base->>'ok')::boolean,false)=false then return base;end if;
  select * into appt from public.booking_appointments
    where manage_token=p_token and kind='booking' and source_environment='staging' limit 1;
  if appt.id is null or lower(btrim(coalesce(appt.service_name,'')))<>'property showing' then
    return base||jsonb_build_object('is_property_showing',false);
  end if;
  listing_text:=substring(coalesce(appt.message,'') from 'Listing ID: ([0-9a-fA-F-]{36})');
  if listing_text is null then return base||jsonb_build_object('is_property_showing',false);end if;
  select * into listing from public.realtor_listings where id=listing_text::uuid and card_id=appt.card_id limit 1;
  if listing.id is null then return base||jsonb_build_object('is_property_showing',false);end if;
  return base||jsonb_build_object(
    'is_property_showing',true,'listing_id',listing.id,
    'property_address',concat_ws(', ',listing.address,listing.city,listing.state,listing.zip),
    'can_reschedule',coalesce((base->>'can_reschedule')::boolean,false)
      and listing.is_visible and listing.status not in ('sold','under_contract','pending')
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.realtor_manage_showing_slots_staging(p_token uuid, p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  details jsonb; appt public.booking_appointments%rowtype; card public.digital_cards%rowtype;
begin
  details:=public.realtor_manage_appointment_staging(p_token);
  if coalesce((details->>'ok')::boolean,false)=false then return details;end if;
  if coalesce((details->>'is_property_showing')::boolean,false)=false then return jsonb_build_object('ok',false,'reason','not_a_showing');end if;
  if coalesce((details->>'can_reschedule')::boolean,false)=false then return jsonb_build_object('ok',false,'reason','changes_closed');end if;
  select * into appt from public.booking_appointments
    where manage_token=p_token and kind='booking' and source_environment='staging' limit 1;
  select * into card from public.digital_cards where id=appt.card_id limit 1;
  if card.id is null then return jsonb_build_object('ok',false,'reason','card_unavailable');end if;
  return public.realtor_showing_slots_staging(card.slug,(details->>'listing_id')::uuid,p_date);
end;
$function$;

CREATE OR REPLACE FUNCTION public.realtor_reschedule_showing_staging(p_token uuid, p_start_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  details jsonb; appt public.booking_appointments%rowtype; card public.digital_cards%rowtype;
  slot_data jsonb; duration_minutes integer; day date;
begin
  select * into appt from public.booking_appointments
    where manage_token=p_token and kind='booking' and source_environment='staging' for update;
  if appt.id is null then return jsonb_build_object('ok',false,'reason','not_found');end if;
  details:=public.realtor_manage_appointment_staging(p_token);
  if coalesce((details->>'is_property_showing')::boolean,false)=false then return jsonb_build_object('ok',false,'reason','not_a_showing');end if;
  if coalesce((details->>'can_reschedule')::boolean,false)=false then return jsonb_build_object('ok',false,'reason','changes_closed');end if;
  select * into card from public.digital_cards where id=appt.card_id limit 1;
  if card.id is null then return jsonb_build_object('ok',false,'reason','card_unavailable');end if;
  day:=(p_start_at at time zone coalesce(nullif(appt.timezone,''),'America/New_York'))::date;
  perform pg_advisory_xact_lock(hashtext(card.id::text||':'||day::text));
  slot_data:=public.realtor_manage_showing_slots_staging(p_token,day);
  if coalesce((slot_data->>'ok')::boolean,false)=false then return slot_data;end if;
  if not exists (
    select 1 from jsonb_array_elements(coalesce(slot_data->'slots','[]'::jsonb)) item
    where (item->>'start_at')::timestamptz=p_start_at
  ) then return jsonb_build_object('ok',false,'reason','slot_unavailable');end if;
  duration_minutes:=greatest(15,least(240,coalesce((slot_data->>'duration_minutes')::integer,30)));
  update public.booking_appointments set
    start_at=p_start_at,end_at=p_start_at+make_interval(mins=>duration_minutes),
    rescheduled_at=now(),reminder_24h_sent_at=null,reminder_2h_sent_at=null
    where id=appt.id;
  return jsonb_build_object('ok',true,'appointment_id',appt.id,'start_at',p_start_at,
    'end_at',p_start_at+make_interval(mins=>duration_minutes),'timezone',appt.timezone,
    'property_address',details->>'property_address','source_environment','staging');
exception when invalid_text_representation or invalid_parameter_value then
  return jsonb_build_object('ok',false,'reason','invalid_request');
end;
$function$;
revoke all on function public.realtor_manage_appointment_staging(uuid) from public;
revoke all on function public.realtor_manage_showing_slots_staging(uuid,date) from public;
revoke all on function public.realtor_reschedule_showing_staging(uuid,timestamptz) from public;
grant execute on function public.realtor_manage_appointment_staging(uuid) to anon,authenticated;
grant execute on function public.realtor_manage_showing_slots_staging(uuid,date) to anon,authenticated;
grant execute on function public.realtor_reschedule_showing_staging(uuid,timestamptz) to anon,authenticated;
