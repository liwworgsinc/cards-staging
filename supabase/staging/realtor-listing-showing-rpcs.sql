-- LIW Cards staging-only Realtor listing booking RPCs.
-- Additive functions only; production booking functions and global availability remain unchanged.
-- Shared DB staging appointments are marked source_environment = 'staging'.
-- Per-listing hours are in digital_cards.realtor_settings.showing_schedules keyed by UUID.

CREATE OR REPLACE FUNCTION public.realtor_book_showing_staging(p_slug text, p_listing_id uuid, p_start_at timestamp with time zone, p_customer_name text, p_customer_email text DEFAULT NULL::text, p_customer_phone text DEFAULT NULL::text, p_message text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.digital_cards%rowtype;
  l public.realtor_listings%rowtype;
  b jsonb; slots jsonb; booked jsonb;
  d integer; service_id uuid; timezone text; appointment_id uuid; manage uuid;
  showing_date date; wanted_start text;
begin
  select * into c from public.digital_cards where slug=lower(btrim(p_slug)) and card_experience='realtor'
    and (status='published' or user_id=(select auth.uid())) limit 1;
  if c.id is null then return jsonb_build_object('ok',false,'reason','card_unavailable');end if;
  select * into l from public.realtor_listings where id=p_listing_id and card_id=c.id and is_visible=true limit 1;
  if l.id is null or l.status in ('sold','under_contract','pending') then return jsonb_build_object('ok',false,'reason','listing_unavailable');end if;
  if length(btrim(coalesce(p_customer_name,'')))<2 then return jsonb_build_object('ok',false,'reason','name_required');end if;
  if nullif(btrim(coalesce(p_customer_email,'')),'') is null and nullif(btrim(coalesce(p_customer_phone,'')),'') is null then
    return jsonb_build_object('ok',false,'reason','contact_required');
  end if;
  b:=public.booking_public_bootstrap(p_slug);
  timezone:=coalesce(nullif(b->>'timezone',''),'America/New_York');
  showing_date:=(p_start_at at time zone timezone)::date;
  perform pg_advisory_xact_lock(hashtext(c.id::text||':'||showing_date::text));
  slots:=public.realtor_showing_slots_staging(p_slug,p_listing_id,showing_date);
  if coalesce((slots->>'ok')::boolean,false)=false then return slots;end if;
  if not exists(select 1 from jsonb_array_elements(coalesce(slots->'slots','[]'::jsonb)) item
    where (item->>'start_at')::timestamptz=p_start_at) then
    return jsonb_build_object('ok',false,'reason','slot_unavailable');
  end if;
  d:=(slots->>'duration_minutes')::integer;
  service_id:=(slots->>'service_id')::uuid;
  insert into public.booking_appointments(
    card_id,user_id,card_service_id,service_name,kind,customer_name,customer_email,
    customer_phone,message,start_at,end_at,timezone,status,source_environment
  ) values (
    c.id,c.user_id,service_id,'Property Showing','booking',left(btrim(p_customer_name),120),
    nullif(left(btrim(coalesce(p_customer_email,'')),180),''),
    nullif(left(btrim(coalesce(p_customer_phone,'')),60),''),
    left('Property: '||concat_ws(', ',l.address,l.city,l.state,l.zip)||E'\nListing ID: '||l.id::text||
      case when nullif(btrim(coalesce(p_message,'')),'') is null then '' else E'\n'||btrim(p_message) end,1000),
    p_start_at,p_start_at+make_interval(mins=>d),timezone,'confirmed','staging'
  ) returning id,manage_token into appointment_id,manage;
  return jsonb_build_object('ok',true,'appointment_id',appointment_id,'manage_token',manage,
    'service_name','Property Showing','listing_id',l.id,'start_at',to_char(p_start_at,'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'timezone',timezone,'source_environment','staging');
end;
$function$;

CREATE OR REPLACE FUNCTION public.realtor_showing_slots_staging(p_slug text, p_listing_id uuid, p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.digital_cards%rowtype;
  l public.realtor_listings%rowtype;
  b jsonb;
  day jsonb;
  service jsonb;
  bs jsonb;
  tz text;
  st time; fin time;
  dur integer; step_minutes integer;
  slot_list jsonb := '[]'::jsonb;
begin
  select * into c from public.digital_cards where slug=lower(btrim(p_slug)) and card_experience='realtor'
    and (status='published' or user_id=(select auth.uid())) limit 1;
  if c.id is null then return jsonb_build_object('ok',false,'reason','card_unavailable');end if;
  select * into l from public.realtor_listings where id=p_listing_id and card_id=c.id and is_visible=true limit 1;
  if l.id is null or l.status in ('sold','under_contract','pending') then
    return jsonb_build_object('ok',false,'reason','listing_unavailable');
  end if;
  if coalesce(c.realtor_settings->>'showing_enabled','false')<>'true' then
    return jsonb_build_object('ok',false,'reason','showing_disabled');
  end if;
  b:=public.booking_public_bootstrap(p_slug);
  if coalesce((b->>'ok')::boolean,false)=false or coalesce((b->>'enabled')::boolean,false)=false then
    return jsonb_build_object('ok',false,'reason','booking_disabled');
  end if;
  if b->>'mode'<>'booking' then return jsonb_build_object('ok',false,'reason','request_only');end if;
  service:=(select item from jsonb_array_elements(coalesce(b->'services','[]'::jsonb)) item
    where item->>'id'=c.realtor_settings->>'showing_service_id' limit 1);
  if service is null or lower(btrim(coalesce(service->>'name',''))) <> 'property showing' then return jsonb_build_object('ok',false,'reason','service_unavailable');end if;
  dur:=greatest(15,least(240,coalesce((service->>'duration_minutes')::integer,30)));
  tz:=coalesce(nullif(b->>'timezone',''),'America/New_York');
  if p_date<(now() at time zone tz)::date or p_date>((now() at time zone tz)::date+coalesce((b->>'days_ahead')::integer,30)) then
    return jsonb_build_object('ok',true,'slots','[]'::jsonb,'timezone',tz);
  end if;
  day:=c.realtor_settings->'showing_schedules'->(p_listing_id::text)->'days'->(extract(dow from p_date)::integer::text);
  if coalesce(day->>'enabled','false')<>'true' then
    return jsonb_build_object('ok',true,'slots','[]'::jsonb,'timezone',tz);
  end if;
  if coalesce(day->>'start','') !~ '^\d{2}:\d{2}$' or coalesce(day->>'end','') !~ '^\d{2}:\d{2}$' then
    return jsonb_build_object('ok',false,'reason','invalid_showing_hours');
  end if;
  st:=(day->>'start')::time;fin:=(day->>'end')::time;
  if fin<=st then return jsonb_build_object('ok',false,'reason','invalid_showing_hours');end if;
  select to_jsonb(row) into bs from public.booking_settings row where card_id=c.id and enabled=true;
  step_minutes:=greatest(15,dur+coalesce((bs->>'buffer_minutes')::integer,0));
  select coalesce(jsonb_agg(jsonb_build_object(
    'start_at',to_char(slot_start,'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'label',to_char(slot_start at time zone tz,'FMHH12:MI AM')
  ) order by slot_start),'[]'::jsonb) into slot_list
  from generate_series(
    (p_date+st)::timestamp at time zone tz,
    (p_date+fin)::timestamp at time zone tz-make_interval(mins=>dur),
    make_interval(mins=>step_minutes)
  ) slot_start
  where slot_start>=now()+make_interval(mins=>coalesce((b->>'min_notice_minutes')::integer,60))
    and not exists(select 1 from public.booking_appointments a where a.card_id=c.id and a.kind='booking' and a.status='confirmed' and a.start_at<slot_start+make_interval(mins=>dur) and a.end_at>slot_start)
    and not exists(select 1 from public.booking_blackouts x where x.card_id=c.id and x.starts_at<slot_start+make_interval(mins=>dur) and x.ends_at>slot_start)
    and not public.liw_calendar_busy_conflict(c.id,slot_start,slot_start+make_interval(mins=>dur));
  return jsonb_build_object('ok',true,'slots',slot_list,'timezone',tz,'duration_minutes',dur,'listing_id',l.id,'service_id',service->>'id');
exception when invalid_parameter_value or datetime_field_overflow then
  return jsonb_build_object('ok',false,'reason','invalid_showing_hours');
end;
$function$;
revoke all on function public.realtor_showing_slots_staging(text,uuid,date) from public;
revoke all on function public.realtor_book_showing_staging(text,uuid,timestamptz,text,text,text,text) from public;
grant execute on function public.realtor_showing_slots_staging(text,uuid,date) to anon,authenticated;
grant execute on function public.realtor_book_showing_staging(text,uuid,timestamptz,text,text,text,text) to anon,authenticated;
