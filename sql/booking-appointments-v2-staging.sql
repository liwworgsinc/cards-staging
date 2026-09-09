-- LIW Cards — Booking / Appointments V2 staging
-- Adds client self-management, blackout dates, reminder preferences, and blackout-aware live slots.
-- Additive to booking-appointments-v1-staging.sql.

begin;

alter table public.booking_settings
  add column if not exists allow_client_reschedule boolean not null default true,
  add column if not exists allow_client_cancel boolean not null default true,
  add column if not exists change_notice_minutes integer not null default 120,
  add column if not exists reminder_24h_enabled boolean not null default true,
  add column if not exists reminder_2h_enabled boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='booking_settings_change_notice_minutes_check'
      and conrelid='public.booking_settings'::regclass
  ) then
    alter table public.booking_settings
      add constraint booking_settings_change_notice_minutes_check
      check (change_notice_minutes between 0 and 10080);
  end if;
end $$;

alter table public.booking_appointments
  add column if not exists manage_token uuid,
  add column if not exists rescheduled_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text,
  add column if not exists cancel_reason text,
  add column if not exists reminder_24h_sent_at timestamptz,
  add column if not exists reminder_2h_sent_at timestamptz;

update public.booking_appointments
set manage_token=gen_random_uuid()
where manage_token is null;

alter table public.booking_appointments
  alter column manage_token set default gen_random_uuid(),
  alter column manage_token set not null;

create unique index if not exists booking_appointments_manage_token_uidx
  on public.booking_appointments(manage_token);

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname='booking_appointments_status_check'
      and conrelid='public.booking_appointments'::regclass
  ) then
    alter table public.booking_appointments drop constraint booking_appointments_status_check;
  end if;
  alter table public.booking_appointments
    add constraint booking_appointments_status_check
    check (status = any(array['requested','confirmed','completed','cancelled','no_show']::text[]));
exception when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='booking_appointments_cancelled_by_check'
      and conrelid='public.booking_appointments'::regclass
  ) then
    alter table public.booking_appointments
      add constraint booking_appointments_cancelled_by_check
      check (cancelled_by is null or cancelled_by in ('client','owner','system'));
  end if;
end $$;

create table if not exists public.booking_blackouts (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.digital_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_blackouts_time_check check (ends_at > starts_at)
);

create index if not exists booking_blackouts_card_time_idx
  on public.booking_blackouts(card_id,starts_at,ends_at);
create index if not exists booking_blackouts_user_idx
  on public.booking_blackouts(user_id);

alter table public.booking_blackouts enable row level security;

drop policy if exists "booking_blackouts_owner_select" on public.booking_blackouts;
create policy "booking_blackouts_owner_select" on public.booking_blackouts
for select to authenticated using (user_id=auth.uid());

drop policy if exists "booking_blackouts_owner_insert" on public.booking_blackouts;
create policy "booking_blackouts_owner_insert" on public.booking_blackouts
for insert to authenticated with check (
  user_id=auth.uid()
  and exists (
    select 1 from public.digital_cards c
    where c.id=card_id and c.user_id=auth.uid()
  )
);

drop policy if exists "booking_blackouts_owner_update" on public.booking_blackouts;
create policy "booking_blackouts_owner_update" on public.booking_blackouts
for update to authenticated using (user_id=auth.uid())
with check (
  user_id=auth.uid()
  and exists (
    select 1 from public.digital_cards c
    where c.id=card_id and c.user_id=auth.uid()
  )
);

drop policy if exists "booking_blackouts_owner_delete" on public.booking_blackouts;
create policy "booking_blackouts_owner_delete" on public.booking_blackouts
for delete to authenticated using (user_id=auth.uid());

drop trigger if exists booking_blackouts_touch_updated_at on public.booking_blackouts;
create trigger booking_blackouts_touch_updated_at
before update on public.booking_blackouts
for each row execute function public.liw_booking_touch_updated_at();

create or replace function public.liw_booking_slot_available(
  p_card_id uuid,
  p_service_id uuid,
  p_start_at timestamptz,
  p_exclude_appointment_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
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

  v_plan := public.liw_booking_plan_for_user(v_card.user_id);
  if v_plan in ('starter','free') then return false; end if;

  select * into v_settings from public.booking_settings
  where card_id=v_card.id and enabled=true;
  if v_settings.card_id is null then return false; end if;

  v_limit := case when v_plan='lite' then 1 when v_plan='plus' then 5 else 100 end;
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

  v_tz := coalesce(nullif(v_settings.timezone,''),'America/New_York');
  v_local := p_start_at at time zone v_tz;
  v_local_date := v_local::date;
  v_local_time := v_local::time;

  if v_local_date < (now() at time zone v_tz)::date
     or v_local_date > ((now() at time zone v_tz)::date + v_settings.days_ahead) then
    return false;
  end if;

  if p_start_at < now() + make_interval(mins=>coalesce(v_settings.min_notice_minutes,60)) then
    return false;
  end if;

  select * into v_avail from public.booking_availability
  where card_id=v_card.id
    and weekday=extract(dow from v_local_date)::smallint
    and enabled=true
  limit 1;

  if v_avail.id is null
     or v_local_time < v_avail.start_time
     or (v_local_time + make_interval(mins=>v_duration)) > v_avail.end_time then
    return false;
  end if;

  v_step := greatest(15,v_duration+coalesce(v_settings.buffer_minutes,0));
  v_offset_minutes := floor(extract(epoch from (v_local_time-v_avail.start_time))/60)::integer;
  if v_offset_minutes < 0 or mod(v_offset_minutes,v_step) <> 0 then
    return false;
  end if;

  v_end := p_start_at + make_interval(mins=>v_duration);

  if exists (
    select 1 from public.booking_blackouts b
    where b.card_id=v_card.id
      and b.starts_at < v_end
      and b.ends_at > p_start_at
  ) then return false; end if;

  if exists (
    select 1 from public.booking_appointments a
    where a.card_id=v_card.id
      and a.kind='booking'
      and a.status='confirmed'
      and (p_exclude_appointment_id is null or a.id<>p_exclude_appointment_id)
      and a.start_at < v_end
      and a.end_at > p_start_at
  ) then return false; end if;

  return true;
exception when invalid_parameter_value then
  return false;
end;
$$;

revoke all on function public.liw_booking_slot_available(uuid,uuid,timestamptz,uuid) from public,anon,authenticated;

create or replace function public.booking_available_slots(p_slug text,p_service_id uuid,p_date date)
returns jsonb language plpgsql security definer stable set search_path=public as $$
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
  v_slots jsonb := '[]'::jsonb;
begin
  select * into v_card from public.digital_cards where slug=trim(p_slug) and status='published' limit 1;
  if v_card.id is null then return jsonb_build_object('ok',false,'reason','not_found','slots','[]'::jsonb); end if;
  v_plan := public.liw_booking_plan_for_user(v_card.user_id);
  if v_plan in ('starter','free') then return jsonb_build_object('ok',false,'reason','request_only','slots','[]'::jsonb); end if;
  select * into v_settings from public.booking_settings where card_id=v_card.id and enabled=true;
  if v_settings.card_id is null then return jsonb_build_object('ok',false,'reason','disabled','slots','[]'::jsonb); end if;
  v_tz := coalesce(nullif(v_settings.timezone,''),'America/New_York');
  if p_date < (now() at time zone v_tz)::date or p_date > ((now() at time zone v_tz)::date + v_settings.days_ahead) then
    return jsonb_build_object('ok',true,'slots','[]'::jsonb);
  end if;
  v_limit := case when v_plan='lite' then 1 when v_plan='plus' then 5 else 100 end;
  select q.duration_minutes into v_duration from (
    select s.id,coalesce(bss.duration_minutes,30) duration_minutes
    from public.card_services s left join public.booking_service_settings bss on bss.card_service_id=s.id
    where s.card_id=v_card.id and s.is_enabled=true and coalesce(bss.enabled,true)=true
    order by s.sort_order,s.name limit v_limit
  ) q where q.id=p_service_id;
  if v_duration is null then return jsonb_build_object('ok',false,'reason','service_unavailable','slots','[]'::jsonb); end if;
  select * into v_avail from public.booking_availability
    where card_id=v_card.id and weekday=extract(dow from p_date)::smallint and enabled=true limit 1;
  if v_avail.id is null then return jsonb_build_object('ok',true,'slots','[]'::jsonb); end if;
  v_start := (p_date + v_avail.start_time)::timestamp at time zone v_tz;
  v_end := (p_date + v_avail.end_time)::timestamp at time zone v_tz;
  v_step := greatest(15,v_duration+coalesce(v_settings.buffer_minutes,0));
  select coalesce(jsonb_agg(jsonb_build_object(
    'start_at',to_char(slot_start,'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'label',to_char(slot_start at time zone v_tz,'FMHH12:MI AM')
  ) order by slot_start),'[]'::jsonb)
  into v_slots
  from generate_series(v_start,v_end-make_interval(mins=>v_duration),make_interval(mins=>v_step)) slot_start
  where slot_start >= now()+make_interval(mins=>coalesce(v_settings.min_notice_minutes,60))
    and not exists (
      select 1 from public.booking_appointments a
      where a.card_id=v_card.id and a.kind='booking' and a.status='confirmed'
        and a.start_at < slot_start+make_interval(mins=>v_duration) and a.end_at > slot_start
    )
    and not exists (
      select 1 from public.booking_blackouts b
      where b.card_id=v_card.id and b.starts_at < slot_start+make_interval(mins=>v_duration) and b.ends_at > slot_start
    );
  return jsonb_build_object('ok',true,'slots',v_slots,'timezone',v_tz);
exception when invalid_parameter_value then
  return jsonb_build_object('ok',false,'reason','timezone_invalid','slots','[]'::jsonb);
end;
$$;

create or replace function public.booking_create_appointment(
  p_slug text,p_service_id uuid,p_start_at timestamptz,p_customer_name text,
  p_customer_email text default null,p_customer_phone text default null,p_message text default null
)
returns jsonb language plpgsql security definer set search_path=public as $$
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
  select * into v_card from public.digital_cards where slug=trim(p_slug) and status='published' limit 1;
  if v_card.id is null then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  v_plan := public.liw_booking_plan_for_user(v_card.user_id);
  if v_plan in ('starter','free') then return jsonb_build_object('ok',false,'reason','request_only'); end if;
  select * into v_settings from public.booking_settings where card_id=v_card.id and enabled=true;
  if v_settings.card_id is null then return jsonb_build_object('ok',false,'reason','disabled'); end if;
  if length(trim(coalesce(p_customer_name,''))) < 2 then return jsonb_build_object('ok',false,'reason','name_required'); end if;
  if nullif(trim(coalesce(p_customer_email,'')),'') is null and nullif(trim(coalesce(p_customer_phone,'')),'') is null then
    return jsonb_build_object('ok',false,'reason','contact_required');
  end if;
  v_limit := case when v_plan='lite' then 1 when v_plan='plus' then 5 else 100 end;
  select q.name,q.duration_minutes,q.payment_url into v_service_name,v_duration,v_payment_url from (
    select s.id,s.name,coalesce(bss.duration_minutes,30) duration_minutes,s.payment_url
    from public.card_services s left join public.booking_service_settings bss on bss.card_service_id=s.id
    where s.card_id=v_card.id and s.is_enabled=true and coalesce(bss.enabled,true)=true
    order by s.sort_order,s.name limit v_limit
  ) q where q.id=p_service_id;
  if v_duration is null then return jsonb_build_object('ok',false,'reason','service_unavailable'); end if;
  v_tz := coalesce(nullif(v_settings.timezone,''),'America/New_York');
  v_local_date := (p_start_at at time zone v_tz)::date;
  perform pg_advisory_xact_lock(hashtext(v_card.id::text||':'||v_local_date::text));
  if not public.liw_booking_slot_available(v_card.id,p_service_id,p_start_at,null) then
    return jsonb_build_object('ok',false,'reason','slot_unavailable');
  end if;
  insert into public.booking_appointments(
    card_id,user_id,card_service_id,service_name,kind,customer_name,customer_email,customer_phone,message,start_at,end_at,timezone,status
  ) values (
    v_card.id,v_card.user_id,p_service_id,v_service_name,'booking',left(trim(p_customer_name),120),
    nullif(left(trim(coalesce(p_customer_email,'')),180),''),nullif(left(trim(coalesce(p_customer_phone,'')),60),''),
    nullif(left(trim(coalesce(p_message,'')),1000),''),p_start_at,p_start_at+make_interval(mins=>v_duration),v_tz,'confirmed'
  ) returning id,manage_token into v_id,v_manage_token;
  return jsonb_build_object(
    'ok',true,'appointment_id',v_id,'manage_token',v_manage_token,'service_name',v_service_name,
    'start_at',to_char(p_start_at,'YYYY-MM-DD"T"HH24:MI:SSOF'),'timezone',v_tz,
    'external_payment_url',case when v_plan in ('pro','agency','white_label') then nullif(trim(coalesce(v_payment_url,'')),'') else null end
  );
exception when invalid_parameter_value then
  return jsonb_build_object('ok',false,'reason','timezone_invalid');
end;
$$;

create or replace function public.booking_manage_lookup(p_token uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare
  v_appt public.booking_appointments%rowtype;
  v_settings public.booking_settings%rowtype;
  v_card public.digital_cards%rowtype;
  v_plan text;
  v_can_reschedule boolean := false;
  v_can_cancel boolean := false;
  v_cutoff timestamptz;
begin
  select * into v_appt from public.booking_appointments where manage_token=p_token and kind='booking' limit 1;
  if v_appt.id is null then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  select * into v_settings from public.booking_settings where card_id=v_appt.card_id;
  select * into v_card from public.digital_cards where id=v_appt.card_id;
  v_plan := public.liw_booking_plan_for_user(v_appt.user_id);
  v_cutoff := coalesce(v_appt.start_at,now())-make_interval(mins=>coalesce(v_settings.change_notice_minutes,120));
  v_can_reschedule := v_appt.status='confirmed' and v_appt.start_at is not null and now()<v_cutoff
    and coalesce(v_settings.allow_client_reschedule,true) and v_plan not in ('starter','free');
  v_can_cancel := v_appt.status='confirmed' and v_appt.start_at is not null and now()<v_cutoff
    and coalesce(v_settings.allow_client_cancel,true);
  return jsonb_build_object(
    'ok',true,'appointment_id',v_appt.id,'status',v_appt.status,'service_name',v_appt.service_name,
    'start_at',v_appt.start_at,'end_at',v_appt.end_at,'timezone',v_appt.timezone,'customer_name',v_appt.customer_name,
    'business_name',coalesce(nullif(trim(coalesce(v_card.company_name,'')),''),nullif(trim(coalesce(v_card.full_name,'')),''),nullif(trim(coalesce(v_card.internal_label,'')),''),'LIW Card'),
    'location_type',coalesce(v_settings.location_type,'business'),'location_text',v_settings.location_text,
    'can_reschedule',v_can_reschedule,'can_cancel',v_can_cancel,'change_notice_minutes',coalesce(v_settings.change_notice_minutes,120),
    'cancel_reason',v_appt.cancel_reason,'rescheduled_at',v_appt.rescheduled_at,'cancelled_at',v_appt.cancelled_at
  );
end;
$$;

create or replace function public.booking_manage_available_slots(p_token uuid,p_date date)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare
  v_appt public.booking_appointments%rowtype;
  v_card public.digital_cards%rowtype;
  v_manage jsonb;
begin
  select * into v_appt from public.booking_appointments where manage_token=p_token and kind='booking' limit 1;
  if v_appt.id is null then return jsonb_build_object('ok',false,'reason','not_found','slots','[]'::jsonb); end if;
  v_manage := public.booking_manage_lookup(p_token);
  if not coalesce((v_manage->>'can_reschedule')::boolean,false) then
    return jsonb_build_object('ok',false,'reason','changes_closed','slots','[]'::jsonb);
  end if;
  select * into v_card from public.digital_cards where id=v_appt.card_id;
  if v_card.id is null or v_appt.card_service_id is null then
    return jsonb_build_object('ok',false,'reason','service_unavailable','slots','[]'::jsonb);
  end if;
  return public.booking_available_slots(v_card.slug,v_appt.card_service_id,p_date);
end;
$$;

create or replace function public.booking_reschedule(p_token uuid,p_start_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_appt public.booking_appointments%rowtype;
  v_settings public.booking_settings%rowtype;
  v_duration integer;
  v_local_date date;
begin
  select * into v_appt from public.booking_appointments where manage_token=p_token and kind='booking' for update;
  if v_appt.id is null then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  if v_appt.status<>'confirmed' then return jsonb_build_object('ok',false,'reason','not_confirmed'); end if;
  select * into v_settings from public.booking_settings where card_id=v_appt.card_id;
  if not coalesce(v_settings.allow_client_reschedule,true) then return jsonb_build_object('ok',false,'reason','reschedule_disabled'); end if;
  if v_appt.start_at is null or now() >= v_appt.start_at-make_interval(mins=>coalesce(v_settings.change_notice_minutes,120)) then
    return jsonb_build_object('ok',false,'reason','changes_closed');
  end if;
  if v_appt.card_service_id is null then return jsonb_build_object('ok',false,'reason','service_unavailable'); end if;
  select coalesce(bss.duration_minutes,30) into v_duration
  from public.card_services s left join public.booking_service_settings bss on bss.card_service_id=s.id
  where s.id=v_appt.card_service_id and s.card_id=v_appt.card_id and s.is_enabled=true;
  if v_duration is null then return jsonb_build_object('ok',false,'reason','service_unavailable'); end if;
  v_local_date := (p_start_at at time zone coalesce(nullif(v_appt.timezone,''),'America/New_York'))::date;
  perform pg_advisory_xact_lock(hashtext(v_appt.card_id::text||':'||v_local_date::text));
  if not public.liw_booking_slot_available(v_appt.card_id,v_appt.card_service_id,p_start_at,v_appt.id) then
    return jsonb_build_object('ok',false,'reason','slot_unavailable');
  end if;
  update public.booking_appointments
  set start_at=p_start_at,end_at=p_start_at+make_interval(mins=>v_duration),rescheduled_at=now(),
      reminder_24h_sent_at=null,reminder_2h_sent_at=null
  where id=v_appt.id;
  return jsonb_build_object('ok',true,'appointment_id',v_appt.id,'start_at',p_start_at,
    'end_at',p_start_at+make_interval(mins=>v_duration),'timezone',v_appt.timezone);
exception when invalid_parameter_value then
  return jsonb_build_object('ok',false,'reason','timezone_invalid');
end;
$$;

create or replace function public.booking_cancel(p_token uuid,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_appt public.booking_appointments%rowtype;
  v_settings public.booking_settings%rowtype;
begin
  select * into v_appt from public.booking_appointments where manage_token=p_token and kind='booking' for update;
  if v_appt.id is null then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  if v_appt.status<>'confirmed' then return jsonb_build_object('ok',false,'reason','not_confirmed'); end if;
  select * into v_settings from public.booking_settings where card_id=v_appt.card_id;
  if not coalesce(v_settings.allow_client_cancel,true) then return jsonb_build_object('ok',false,'reason','cancel_disabled'); end if;
  if v_appt.start_at is null or now() >= v_appt.start_at-make_interval(mins=>coalesce(v_settings.change_notice_minutes,120)) then
    return jsonb_build_object('ok',false,'reason','changes_closed');
  end if;
  update public.booking_appointments
  set status='cancelled',cancelled_at=now(),cancelled_by='client',
      cancel_reason=nullif(left(trim(coalesce(p_reason,'')),500),'')
  where id=v_appt.id;
  return jsonb_build_object('ok',true,'appointment_id',v_appt.id,'status','cancelled');
end;
$$;

revoke all on public.booking_blackouts from anon;
grant select,insert,update,delete on public.booking_blackouts to authenticated;

revoke all on function public.booking_manage_lookup(uuid) from public;
revoke all on function public.booking_manage_available_slots(uuid,date) from public;
revoke all on function public.booking_reschedule(uuid,timestamptz) from public;
revoke all on function public.booking_cancel(uuid,text) from public;

grant execute on function public.booking_available_slots(text,uuid,date) to anon,authenticated;
grant execute on function public.booking_create_appointment(text,uuid,timestamptz,text,text,text,text) to anon,authenticated;
grant execute on function public.booking_manage_lookup(uuid) to anon,authenticated;
grant execute on function public.booking_manage_available_slots(uuid,date) to anon,authenticated;
grant execute on function public.booking_reschedule(uuid,timestamptz) to anon,authenticated;
grant execute on function public.booking_cancel(uuid,text) to anon,authenticated;

commit;
