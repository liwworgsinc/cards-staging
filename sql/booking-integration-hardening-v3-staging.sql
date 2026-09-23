-- LIW Cards — Appointments integration hardening V3 (staging only)
-- Additive RPCs keep staging booking traffic isolated from future production traffic.

begin;

create index if not exists booking_appointments_staging_card_time_idx
  on public.booking_appointments(card_id,start_at,end_at)
  where source_environment='staging' and kind='booking' and status='confirmed';

create or replace function public.liw_calendar_busy_conflict_staging_v3(
  p_card_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.booking_card_calendar_settings s
    join public.booking_calendar_connections c
      on c.id=s.connection_id
     and c.user_id=s.user_id
     and c.provider=s.provider
    join public.booking_calendar_busy b
      on b.card_id=s.card_id
     and b.provider=s.provider
    where s.card_id=p_card_id
      and s.environment='staging'
      and s.enabled=true
      and s.block_busy=true
      and c.status='connected'
      and s.last_busy_sync_at is not null
      and s.last_busy_sync_at >= now()-interval '10 minutes'
      and b.fetched_at >= now()-interval '10 minutes'
      and b.starts_at<p_end_at
      and b.ends_at>p_start_at
  );
$$;

create or replace function public.liw_booking_slot_available_staging_v3(
  p_card_id uuid,
  p_service_id uuid,
  p_start_at timestamptz,
  p_exclude_appointment_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_card public.digital_cards%rowtype;
  v_settings public.booking_settings%rowtype;
  v_avail public.booking_availability%rowtype;
  v_plan text;
  v_limit integer;
  v_duration integer;
  v_tz text;
  v_local timestamp;
  v_local_date date;
  v_local_time time;
  v_end timestamptz;
  v_step integer;
  v_offset_minutes integer;
begin
  select * into v_card from public.digital_cards where id=p_card_id limit 1;
  if v_card.id is null then return false; end if;

  v_plan:=public.liw_booking_plan_for_user(v_card.user_id);
  if v_plan in ('starter','free') then return false; end if;

  select * into v_settings from public.booking_settings
  where card_id=v_card.id and enabled=true;
  if v_settings.card_id is null then return false; end if;

  v_limit:=case when v_plan='lite' then 1 when v_plan='plus' then 5 else 100 end;
  select q.duration_minutes into v_duration
  from (
    select s.id,coalesce(bss.duration_minutes,30) duration_minutes
    from public.card_services s
    left join public.booking_service_settings bss on bss.card_service_id=s.id
    where s.card_id=v_card.id
      and s.is_enabled=true
      and coalesce(bss.enabled,true)=true
    order by s.sort_order,s.name
    limit v_limit
  ) q
  where q.id=p_service_id;

  if v_duration is null then return false; end if;

  v_tz:=coalesce(nullif(v_settings.timezone,''),'America/New_York');
  v_local:=p_start_at at time zone v_tz;
  v_local_date:=v_local::date;
  v_local_time:=v_local::time;

  if v_local_date < (now() at time zone v_tz)::date
     or v_local_date > ((now() at time zone v_tz)::date+v_settings.days_ahead) then
    return false;
  end if;

  if p_start_at < now()+make_interval(mins=>coalesce(v_settings.min_notice_minutes,60)) then
    return false;
  end if;

  select * into v_avail
  from public.booking_availability
  where card_id=v_card.id
    and weekday=extract(dow from v_local_date)::smallint
    and enabled=true
  limit 1;

  if v_avail.id is null
     or v_local_time<v_avail.start_time
     or (v_local_time+make_interval(mins=>v_duration))>v_avail.end_time then
    return false;
  end if;

  v_step:=greatest(15,v_duration+coalesce(v_settings.buffer_minutes,0));
  v_offset_minutes:=floor(extract(epoch from (v_local_time-v_avail.start_time))/60)::integer;
  if v_offset_minutes<0 or mod(v_offset_minutes,v_step)<>0 then
    return false;
  end if;

  v_end:=p_start_at+make_interval(mins=>v_duration);

  if exists(
    select 1 from public.booking_blackouts b
    where b.card_id=v_card.id
      and b.starts_at<v_end
      and b.ends_at>p_start_at
  ) then return false; end if;

  if public.liw_calendar_busy_conflict_staging_v3(v_card.id,p_start_at,v_end) then
    return false;
  end if;

  if exists(
    select 1 from public.booking_appointments a
    where a.card_id=v_card.id
      and a.source_environment='staging'
      and a.kind='booking'
      and a.status='confirmed'
      and (p_exclude_appointment_id is null or a.id<>p_exclude_appointment_id)
      and a.start_at<v_end
      and a.end_at>p_start_at
  ) then return false; end if;

  return true;
exception when invalid_parameter_value then
  return false;
end;
$$;

create or replace function public.booking_available_slots_staging_v3(
  p_slug text,
  p_service_id uuid,
  p_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_card public.digital_cards%rowtype;
  v_settings public.booking_settings%rowtype;
  v_avail public.booking_availability%rowtype;
  v_plan text;
  v_limit integer;
  v_duration integer;
  v_step integer;
  v_tz text;
  v_start timestamptz;
  v_end timestamptz;
  v_slots jsonb:='[]'::jsonb;
begin
  select * into v_card
  from public.digital_cards
  where slug=trim(p_slug) and status='published'
  limit 1;
  if v_card.id is null then
    return jsonb_build_object('ok',false,'reason','not_found','slots','[]'::jsonb);
  end if;

  v_plan:=public.liw_booking_plan_for_user(v_card.user_id);
  if v_plan in ('starter','free') then
    return jsonb_build_object('ok',false,'reason','request_only','slots','[]'::jsonb);
  end if;

  select * into v_settings
  from public.booking_settings
  where card_id=v_card.id and enabled=true;
  if v_settings.card_id is null then
    return jsonb_build_object('ok',false,'reason','disabled','slots','[]'::jsonb);
  end if;

  v_tz:=coalesce(nullif(v_settings.timezone,''),'America/New_York');
  if p_date<(now() at time zone v_tz)::date
     or p_date>((now() at time zone v_tz)::date+v_settings.days_ahead) then
    return jsonb_build_object('ok',true,'slots','[]'::jsonb);
  end if;

  v_limit:=case when v_plan='lite' then 1 when v_plan='plus' then 5 else 100 end;
  select q.duration_minutes into v_duration
  from (
    select s.id,coalesce(bss.duration_minutes,30) duration_minutes
    from public.card_services s
    left join public.booking_service_settings bss on bss.card_service_id=s.id
    where s.card_id=v_card.id
      and s.is_enabled=true
      and coalesce(bss.enabled,true)=true
    order by s.sort_order,s.name
    limit v_limit
  ) q
  where q.id=p_service_id;

  if v_duration is null then
    return jsonb_build_object('ok',false,'reason','service_unavailable','slots','[]'::jsonb);
  end if;

  select * into v_avail
  from public.booking_availability
  where card_id=v_card.id
    and weekday=extract(dow from p_date)::smallint
    and enabled=true
  limit 1;
  if v_avail.id is null then
    return jsonb_build_object('ok',true,'slots','[]'::jsonb);
  end if;

  v_start:=(p_date+v_avail.start_time)::timestamp at time zone v_tz;
  v_end:=(p_date+v_avail.end_time)::timestamp at time zone v_tz;
  v_step:=greatest(15,v_duration+coalesce(v_settings.buffer_minutes,0));

  select coalesce(jsonb_agg(jsonb_build_object(
    'start_at',to_char(slot_start,'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'label',to_char(slot_start at time zone v_tz,'FMHH12:MI AM')
  ) order by slot_start),'[]'::jsonb)
  into v_slots
  from generate_series(v_start,v_end-make_interval(mins=>v_duration),make_interval(mins=>v_step)) slot_start
  where slot_start>=now()+make_interval(mins=>coalesce(v_settings.min_notice_minutes,60))
    and not exists(
      select 1 from public.booking_appointments a
      where a.card_id=v_card.id
        and a.source_environment='staging'
        and a.kind='booking'
        and a.status='confirmed'
        and a.start_at<slot_start+make_interval(mins=>v_duration)
        and a.end_at>slot_start
    )
    and not exists(
      select 1 from public.booking_blackouts b
      where b.card_id=v_card.id
        and b.starts_at<slot_start+make_interval(mins=>v_duration)
        and b.ends_at>slot_start
    )
    and not public.liw_calendar_busy_conflict_staging_v3(
      v_card.id,slot_start,slot_start+make_interval(mins=>v_duration)
    );

  return jsonb_build_object('ok',true,'slots',v_slots,'timezone',v_tz);
exception when invalid_parameter_value then
  return jsonb_build_object('ok',false,'reason','timezone_invalid','slots','[]'::jsonb);
end;
$$;

create or replace function public.booking_submit_request_staging_v3(
  p_slug text,
  p_service_id uuid,
  p_customer_name text,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_preferred_start_at timestamptz default null,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_card public.digital_cards%rowtype;
  v_settings public.booking_settings%rowtype;
  v_service_name text:='General service';
  v_id uuid;
  v_tz text;
begin
  select * into v_card
  from public.digital_cards
  where slug=trim(p_slug) and status='published'
  limit 1;
  if v_card.id is null then return jsonb_build_object('ok',false,'reason','not_found'); end if;

  select * into v_settings
  from public.booking_settings
  where card_id=v_card.id and enabled=true;
  if v_settings.card_id is null then return jsonb_build_object('ok',false,'reason','disabled'); end if;

  if length(trim(coalesce(p_customer_name,'')))<2 then
    return jsonb_build_object('ok',false,'reason','name_required');
  end if;
  if nullif(trim(coalesce(p_customer_email,'')),'') is null
     and nullif(trim(coalesce(p_customer_phone,'')),'') is null then
    return jsonb_build_object('ok',false,'reason','contact_required');
  end if;

  if p_service_id is not null then
    select name into v_service_name
    from public.card_services
    where id=p_service_id and card_id=v_card.id and is_enabled=true;
    if v_service_name is null then
      return jsonb_build_object('ok',false,'reason','service_unavailable');
    end if;
  end if;

  v_tz:=coalesce(nullif(v_settings.timezone,''),'America/New_York');

  insert into public.booking_appointments(
    card_id,user_id,card_service_id,service_name,kind,
    customer_name,customer_email,customer_phone,message,
    preferred_start_at,timezone,status,source_environment
  )
  values(
    v_card.id,v_card.user_id,p_service_id,v_service_name,'request',
    left(trim(p_customer_name),120),
    nullif(left(trim(coalesce(p_customer_email,'')),180),''),
    nullif(left(trim(coalesce(p_customer_phone,'')),60),''),
    nullif(left(trim(coalesce(p_message,'')),1000),''),
    p_preferred_start_at,v_tz,'requested','staging'
  )
  returning id into v_id;

  return jsonb_build_object('ok',true,'request_id',v_id,'message','Request sent','source_environment','staging');
end;
$$;

create or replace function public.booking_create_appointment_staging_v3(
  p_slug text,
  p_service_id uuid,
  p_start_at timestamptz,
  p_customer_name text,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_card public.digital_cards%rowtype;
  v_settings public.booking_settings%rowtype;
  v_plan text;
  v_limit integer;
  v_duration integer;
  v_service_name text;
  v_payment_url text;
  v_tz text;
  v_local_date date;
  v_id uuid;
  v_manage_token uuid;
begin
  select * into v_card
  from public.digital_cards
  where slug=trim(p_slug) and status='published'
  limit 1;
  if v_card.id is null then return jsonb_build_object('ok',false,'reason','not_found'); end if;

  v_plan:=public.liw_booking_plan_for_user(v_card.user_id);
  if v_plan in ('starter','free') then
    return jsonb_build_object('ok',false,'reason','request_only');
  end if;

  select * into v_settings
  from public.booking_settings
  where card_id=v_card.id and enabled=true;
  if v_settings.card_id is null then return jsonb_build_object('ok',false,'reason','disabled'); end if;

  if length(trim(coalesce(p_customer_name,'')))<2 then
    return jsonb_build_object('ok',false,'reason','name_required');
  end if;
  if nullif(trim(coalesce(p_customer_email,'')),'') is null
     and nullif(trim(coalesce(p_customer_phone,'')),'') is null then
    return jsonb_build_object('ok',false,'reason','contact_required');
  end if;

  v_limit:=case when v_plan='lite' then 1 when v_plan='plus' then 5 else 100 end;
  select q.name,q.duration_minutes,q.payment_url
    into v_service_name,v_duration,v_payment_url
  from (
    select s.id,s.name,coalesce(bss.duration_minutes,30) duration_minutes,s.payment_url
    from public.card_services s
    left join public.booking_service_settings bss on bss.card_service_id=s.id
    where s.card_id=v_card.id
      and s.is_enabled=true
      and coalesce(bss.enabled,true)=true
    order by s.sort_order,s.name
    limit v_limit
  ) q
  where q.id=p_service_id;

  if v_duration is null then
    return jsonb_build_object('ok',false,'reason','service_unavailable');
  end if;

  v_tz:=coalesce(nullif(v_settings.timezone,''),'America/New_York');
  v_local_date:=(p_start_at at time zone v_tz)::date;

  perform pg_advisory_xact_lock(hashtext('staging:'||v_card.id::text||':'||v_local_date::text));

  if not public.liw_booking_slot_available_staging_v3(v_card.id,p_service_id,p_start_at,null) then
    return jsonb_build_object('ok',false,'reason','slot_unavailable');
  end if;

  insert into public.booking_appointments(
    card_id,user_id,card_service_id,service_name,kind,
    customer_name,customer_email,customer_phone,message,
    start_at,end_at,timezone,status,source_environment
  )
  values(
    v_card.id,v_card.user_id,p_service_id,v_service_name,'booking',
    left(trim(p_customer_name),120),
    nullif(left(trim(coalesce(p_customer_email,'')),180),''),
    nullif(left(trim(coalesce(p_customer_phone,'')),60),''),
    nullif(left(trim(coalesce(p_message,'')),1000),''),
    p_start_at,p_start_at+make_interval(mins=>v_duration),
    v_tz,'confirmed','staging'
  )
  returning id,manage_token into v_id,v_manage_token;

  return jsonb_build_object(
    'ok',true,
    'appointment_id',v_id,
    'manage_token',v_manage_token,
    'service_name',v_service_name,
    'start_at',to_char(p_start_at,'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'timezone',v_tz,
    'source_environment','staging',
    'external_payment_url',
      case when v_plan in ('pro','agency','white_label')
        then nullif(trim(coalesce(v_payment_url,'')),'')
        else null
      end
  );
exception when invalid_parameter_value then
  return jsonb_build_object('ok',false,'reason','timezone_invalid');
end;
$$;

create or replace function public.booking_manage_lookup_staging_v3(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_appt public.booking_appointments%rowtype;
  v_settings public.booking_settings%rowtype;
  v_card public.digital_cards%rowtype;
  v_plan text;
  v_can_reschedule boolean:=false;
  v_can_cancel boolean:=false;
  v_cutoff timestamptz;
begin
  select * into v_appt
  from public.booking_appointments
  where manage_token=p_token
    and kind='booking'
    and source_environment='staging'
  limit 1;

  if v_appt.id is null then return jsonb_build_object('ok',false,'reason','not_found'); end if;

  select * into v_settings from public.booking_settings where card_id=v_appt.card_id;
  select * into v_card from public.digital_cards where id=v_appt.card_id;
  v_plan:=public.liw_booking_plan_for_user(v_appt.user_id);
  v_cutoff:=coalesce(v_appt.start_at,now())-make_interval(mins=>coalesce(v_settings.change_notice_minutes,120));

  v_can_reschedule:=v_appt.status='confirmed'
    and v_appt.start_at is not null
    and now()<v_cutoff
    and coalesce(v_settings.allow_client_reschedule,true)
    and v_plan not in ('starter','free');

  v_can_cancel:=v_appt.status='confirmed'
    and v_appt.start_at is not null
    and now()<v_cutoff
    and coalesce(v_settings.allow_client_cancel,true);

  return jsonb_build_object(
    'ok',true,
    'appointment_id',v_appt.id,
    'status',v_appt.status,
    'service_name',v_appt.service_name,
    'start_at',v_appt.start_at,
    'end_at',v_appt.end_at,
    'timezone',v_appt.timezone,
    'customer_name',v_appt.customer_name,
    'business_name',coalesce(
      nullif(trim(coalesce(v_card.company_name,'')),''),
      nullif(trim(coalesce(v_card.full_name,'')),''),
      nullif(trim(coalesce(v_card.internal_label,'')),''),
      'LIW Card'
    ),
    'location_type',coalesce(v_settings.location_type,'business'),
    'location_text',v_settings.location_text,
    'can_reschedule',v_can_reschedule,
    'can_cancel',v_can_cancel,
    'change_notice_minutes',coalesce(v_settings.change_notice_minutes,120),
    'cancel_reason',v_appt.cancel_reason,
    'rescheduled_at',v_appt.rescheduled_at,
    'cancelled_at',v_appt.cancelled_at,
    'source_environment','staging'
  );
end;
$$;

create or replace function public.booking_manage_available_slots_staging_v3(
  p_token uuid,
  p_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_appt public.booking_appointments%rowtype;
  v_card public.digital_cards%rowtype;
  v_manage jsonb;
begin
  select * into v_appt
  from public.booking_appointments
  where manage_token=p_token
    and kind='booking'
    and source_environment='staging'
  limit 1;

  if v_appt.id is null then
    return jsonb_build_object('ok',false,'reason','not_found','slots','[]'::jsonb);
  end if;

  v_manage:=public.booking_manage_lookup_staging_v3(p_token);
  if not coalesce((v_manage->>'can_reschedule')::boolean,false) then
    return jsonb_build_object('ok',false,'reason','changes_closed','slots','[]'::jsonb);
  end if;

  select * into v_card from public.digital_cards where id=v_appt.card_id;
  if v_card.id is null or v_appt.card_service_id is null then
    return jsonb_build_object('ok',false,'reason','service_unavailable','slots','[]'::jsonb);
  end if;

  return public.booking_available_slots_staging_v3(v_card.slug,v_appt.card_service_id,p_date);
end;
$$;

create or replace function public.booking_reschedule_staging_v3(
  p_token uuid,
  p_start_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_appt public.booking_appointments%rowtype;
  v_settings public.booking_settings%rowtype;
  v_duration integer;
  v_local_date date;
begin
  select * into v_appt
  from public.booking_appointments
  where manage_token=p_token
    and kind='booking'
    and source_environment='staging'
  for update;

  if v_appt.id is null then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  if v_appt.status<>'confirmed' then return jsonb_build_object('ok',false,'reason','not_confirmed'); end if;

  select * into v_settings from public.booking_settings where card_id=v_appt.card_id;
  if not coalesce(v_settings.allow_client_reschedule,true) then
    return jsonb_build_object('ok',false,'reason','reschedule_disabled');
  end if;
  if v_appt.start_at is null
     or now()>=v_appt.start_at-make_interval(mins=>coalesce(v_settings.change_notice_minutes,120)) then
    return jsonb_build_object('ok',false,'reason','changes_closed');
  end if;
  if v_appt.card_service_id is null then
    return jsonb_build_object('ok',false,'reason','service_unavailable');
  end if;

  select coalesce(bss.duration_minutes,30)
    into v_duration
  from public.card_services s
  left join public.booking_service_settings bss on bss.card_service_id=s.id
  where s.id=v_appt.card_service_id
    and s.card_id=v_appt.card_id
    and s.is_enabled=true;

  if v_duration is null then
    return jsonb_build_object('ok',false,'reason','service_unavailable');
  end if;

  v_local_date:=(p_start_at at time zone coalesce(nullif(v_appt.timezone,''),'America/New_York'))::date;
  perform pg_advisory_xact_lock(hashtext('staging:'||v_appt.card_id::text||':'||v_local_date::text));

  if not public.liw_booking_slot_available_staging_v3(
    v_appt.card_id,v_appt.card_service_id,p_start_at,v_appt.id
  ) then
    return jsonb_build_object('ok',false,'reason','slot_unavailable');
  end if;

  update public.booking_appointments
  set start_at=p_start_at,
      end_at=p_start_at+make_interval(mins=>v_duration),
      rescheduled_at=now(),
      reminder_24h_sent_at=null,
      reminder_2h_sent_at=null
  where id=v_appt.id;

  return jsonb_build_object(
    'ok',true,
    'appointment_id',v_appt.id,
    'start_at',p_start_at,
    'end_at',p_start_at+make_interval(mins=>v_duration),
    'timezone',v_appt.timezone,
    'source_environment','staging'
  );
exception when invalid_parameter_value then
  return jsonb_build_object('ok',false,'reason','timezone_invalid');
end;
$$;

create or replace function public.booking_cancel_staging_v3(
  p_token uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_appt public.booking_appointments%rowtype;
  v_settings public.booking_settings%rowtype;
begin
  select * into v_appt
  from public.booking_appointments
  where manage_token=p_token
    and kind='booking'
    and source_environment='staging'
  for update;

  if v_appt.id is null then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  if v_appt.status<>'confirmed' then return jsonb_build_object('ok',false,'reason','not_confirmed'); end if;

  select * into v_settings from public.booking_settings where card_id=v_appt.card_id;
  if not coalesce(v_settings.allow_client_cancel,true) then
    return jsonb_build_object('ok',false,'reason','cancel_disabled');
  end if;
  if v_appt.start_at is null
     or now()>=v_appt.start_at-make_interval(mins=>coalesce(v_settings.change_notice_minutes,120)) then
    return jsonb_build_object('ok',false,'reason','changes_closed');
  end if;

  update public.booking_appointments
  set status='cancelled',
      cancelled_at=now(),
      cancelled_by='client',
      cancel_reason=nullif(left(trim(coalesce(p_reason,'')),500),'')
  where id=v_appt.id;

  return jsonb_build_object('ok',true,'appointment_id',v_appt.id,'status','cancelled','source_environment','staging');
end;
$$;

revoke all on function public.liw_calendar_busy_conflict_staging_v3(uuid,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.liw_booking_slot_available_staging_v3(uuid,uuid,timestamptz,uuid) from public,anon,authenticated;

revoke all on function public.booking_available_slots_staging_v3(text,uuid,date) from public;
revoke all on function public.booking_submit_request_staging_v3(text,uuid,text,text,text,timestamptz,text) from public;
revoke all on function public.booking_create_appointment_staging_v3(text,uuid,timestamptz,text,text,text,text) from public;
revoke all on function public.booking_manage_lookup_staging_v3(uuid) from public;
revoke all on function public.booking_manage_available_slots_staging_v3(uuid,date) from public;
revoke all on function public.booking_reschedule_staging_v3(uuid,timestamptz) from public;
revoke all on function public.booking_cancel_staging_v3(uuid,text) from public;

grant execute on function public.booking_available_slots_staging_v3(text,uuid,date) to anon,authenticated;
grant execute on function public.booking_submit_request_staging_v3(text,uuid,text,text,text,timestamptz,text) to anon,authenticated;
grant execute on function public.booking_create_appointment_staging_v3(text,uuid,timestamptz,text,text,text,text) to anon,authenticated;
grant execute on function public.booking_manage_lookup_staging_v3(uuid) to anon,authenticated;
grant execute on function public.booking_manage_available_slots_staging_v3(uuid,date) to anon,authenticated;
grant execute on function public.booking_reschedule_staging_v3(uuid,timestamptz) to anon,authenticated;
grant execute on function public.booking_cancel_staging_v3(uuid,text) to anon,authenticated;

commit;
