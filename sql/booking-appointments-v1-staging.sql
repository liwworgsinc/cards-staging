-- LIW Cards Booking / Appointments V1 — staging
-- Additive schema used by the staging booking UI. Public writes are RPC-only.

create table if not exists public.booking_settings (
  card_id uuid primary key references public.digital_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  timezone text not null default 'America/New_York',
  min_notice_minutes integer not null default 60 check (min_notice_minutes between 0 and 10080),
  days_ahead integer not null default 30 check (days_ahead between 1 and 365),
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 180),
  location_type text not null default 'business' check (location_type in ('business','phone','video','mobile','custom')),
  location_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_availability (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.digital_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null default '09:00',
  end_time time not null default '17:00',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(card_id, weekday),
  check (end_time > start_time)
);

create table if not exists public.booking_service_settings (
  card_service_id uuid primary key references public.card_services(id) on delete cascade,
  card_id uuid not null references public.digital_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_minutes integer not null default 30 check (duration_minutes between 15 and 480),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_appointments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.digital_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_service_id uuid references public.card_services(id) on delete set null,
  service_name text not null default 'General service',
  kind text not null check (kind in ('request','booking')),
  customer_name text not null,
  customer_email text,
  customer_phone text,
  message text,
  preferred_start_at timestamptz,
  start_at timestamptz,
  end_at timestamptz,
  timezone text not null default 'America/New_York',
  status text not null default 'requested' check (status in ('requested','confirmed','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'request') or (start_at is not null and end_at is not null)),
  check (end_at is null or start_at is null or end_at > start_at)
);

create index if not exists booking_appointments_owner_start_idx
  on public.booking_appointments(user_id, start_at desc);
create index if not exists booking_appointments_card_start_idx
  on public.booking_appointments(card_id, start_at);
create index if not exists booking_appointments_owner_created_idx
  on public.booking_appointments(user_id, created_at desc);

alter table public.booking_settings enable row level security;
alter table public.booking_availability enable row level security;
alter table public.booking_service_settings enable row level security;
alter table public.booking_appointments enable row level security;

-- Owner-only CRUD for setup tables.
drop policy if exists booking_settings_owner_all on public.booking_settings;
create policy booking_settings_owner_all on public.booking_settings for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.digital_cards c where c.id = card_id and c.user_id = (select auth.uid())
  ));

drop policy if exists booking_availability_owner_all on public.booking_availability;
create policy booking_availability_owner_all on public.booking_availability for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.digital_cards c where c.id = card_id and c.user_id = (select auth.uid())
  ));

drop policy if exists booking_service_settings_owner_all on public.booking_service_settings;
create policy booking_service_settings_owner_all on public.booking_service_settings for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.digital_cards c where c.id = card_id and c.user_id = (select auth.uid())
  ) and exists (
    select 1 from public.card_services s where s.id = card_service_id and s.card_id = card_id
  ));

-- Owners can read and manage appointment status. Public inserts are intentionally not granted.
drop policy if exists booking_appointments_owner_select on public.booking_appointments;
create policy booking_appointments_owner_select on public.booking_appointments for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists booking_appointments_owner_update on public.booking_appointments;
create policy booking_appointments_owner_update on public.booking_appointments for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists booking_appointments_owner_delete on public.booking_appointments;
create policy booking_appointments_owner_delete on public.booking_appointments for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.liw_booking_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists booking_settings_touch_updated_at on public.booking_settings;
create trigger booking_settings_touch_updated_at before update on public.booking_settings
for each row execute function public.liw_booking_touch_updated_at();
drop trigger if exists booking_availability_touch_updated_at on public.booking_availability;
create trigger booking_availability_touch_updated_at before update on public.booking_availability
for each row execute function public.liw_booking_touch_updated_at();
drop trigger if exists booking_service_settings_touch_updated_at on public.booking_service_settings;
create trigger booking_service_settings_touch_updated_at before update on public.booking_service_settings
for each row execute function public.liw_booking_touch_updated_at();
drop trigger if exists booking_appointments_touch_updated_at on public.booking_appointments;
create trigger booking_appointments_touch_updated_at before update on public.booking_appointments
for each row execute function public.liw_booking_touch_updated_at();

create or replace function public.liw_booking_plan_for_user(p_user_id uuid)
returns text language plpgsql security definer stable set search_path = public as $$
declare v_plan text := 'starter'; v_role text;
begin
  select role into v_role from public.profiles where id = p_user_id;
  if v_role = 'admin' then return 'pro'; end if;
  select s.plan_key into v_plan
    from public.subscriptions s
    where s.user_id = p_user_id and s.status in ('active','trialing')
    limit 1;
  return coalesce(nullif(v_plan,''),'starter');
end;
$$;

create or replace function public.booking_public_bootstrap(p_slug text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare
  v_card public.digital_cards%rowtype;
  v_settings public.booking_settings%rowtype;
  v_plan text;
  v_limit integer;
  v_mode text;
  v_services jsonb := '[]'::jsonb;
begin
  select * into v_card from public.digital_cards
    where slug = trim(p_slug) and status = 'published' limit 1;
  if v_card.id is null then return jsonb_build_object('ok',false,'reason','not_found'); end if;

  v_plan := public.liw_booking_plan_for_user(v_card.user_id);
  v_mode := case when v_plan in ('starter','free') then 'request' else 'booking' end;
  v_limit := case
    when v_plan = 'lite' then 1
    when v_plan = 'plus' then 5
    when v_plan in ('pro','agency','white_label') then 100
    else 8
  end;

  select * into v_settings from public.booking_settings where card_id = v_card.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'name', q.name,
    'description', q.description,
    'price_cents', q.price_cents,
    'duration_minutes', q.duration_minutes,
    'has_external_payment', q.has_external_payment
  ) order by q.sort_order, q.name), '[]'::jsonb)
  into v_services
  from (
    select s.id, s.name, s.description, s.price_cents, s.sort_order,
      coalesce(bss.duration_minutes,30) as duration_minutes,
      (v_plan in ('pro','agency','white_label') and nullif(trim(coalesce(s.payment_url,'')),'') is not null) as has_external_payment
    from public.card_services s
    left join public.booking_service_settings bss on bss.card_service_id = s.id
    where s.card_id = v_card.id and s.is_enabled = true and coalesce(bss.enabled,true) = true
    order by s.sort_order, s.name
    limit v_limit
  ) q;

  return jsonb_build_object(
    'ok', true,
    'card_id', v_card.id,
    'mode', v_mode,
    'plan', v_plan,
    'service_limit', v_limit,
    'enabled', coalesce(v_settings.enabled,false),
    'timezone', coalesce(v_settings.timezone,'America/New_York'),
    'min_notice_minutes', coalesce(v_settings.min_notice_minutes,60),
    'days_ahead', coalesce(v_settings.days_ahead,30),
    'location_type', coalesce(v_settings.location_type,'business'),
    'location_text', v_settings.location_text,
    'services', v_services
  );
end;
$$;

create or replace function public.booking_available_slots(p_slug text, p_service_id uuid, p_date date)
returns jsonb language plpgsql security definer stable set search_path = public as $$
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
  select * into v_card from public.digital_cards where slug = trim(p_slug) and status = 'published' limit 1;
  if v_card.id is null then return jsonb_build_object('ok',false,'reason','not_found','slots','[]'::jsonb); end if;
  v_plan := public.liw_booking_plan_for_user(v_card.user_id);
  if v_plan in ('starter','free') then return jsonb_build_object('ok',false,'reason','request_only','slots','[]'::jsonb); end if;

  select * into v_settings from public.booking_settings where card_id = v_card.id and enabled = true;
  if v_settings.card_id is null then return jsonb_build_object('ok',false,'reason','disabled','slots','[]'::jsonb); end if;
  v_tz := coalesce(nullif(v_settings.timezone,''),'America/New_York');

  if p_date < (now() at time zone v_tz)::date or p_date > ((now() at time zone v_tz)::date + v_settings.days_ahead) then
    return jsonb_build_object('ok',true,'slots','[]'::jsonb);
  end if;

  v_limit := case when v_plan='lite' then 1 when v_plan='plus' then 5 else 100 end;
  select q.duration_minutes into v_duration from (
    select s.id, coalesce(bss.duration_minutes,30) duration_minutes
    from public.card_services s
    left join public.booking_service_settings bss on bss.card_service_id=s.id
    where s.card_id=v_card.id and s.is_enabled=true and coalesce(bss.enabled,true)=true
    order by s.sort_order,s.name limit v_limit
  ) q where q.id=p_service_id;
  if v_duration is null then return jsonb_build_object('ok',false,'reason','service_unavailable','slots','[]'::jsonb); end if;

  select * into v_avail from public.booking_availability
    where card_id=v_card.id and weekday=extract(dow from p_date)::smallint and enabled=true limit 1;
  if v_avail.id is null then return jsonb_build_object('ok',true,'slots','[]'::jsonb); end if;

  v_start := (p_date + v_avail.start_time)::timestamp at time zone v_tz;
  v_end := (p_date + v_avail.end_time)::timestamp at time zone v_tz;
  v_step := greatest(15, v_duration + coalesce(v_settings.buffer_minutes,0));

  select coalesce(jsonb_agg(jsonb_build_object(
    'start_at', to_char(slot_start,'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'label', to_char(slot_start at time zone v_tz,'FMHH12:MI AM')
  ) order by slot_start),'[]'::jsonb)
  into v_slots
  from generate_series(v_start, v_end - make_interval(mins=>v_duration), make_interval(mins=>v_step)) slot_start
  where slot_start >= now() + make_interval(mins=>coalesce(v_settings.min_notice_minutes,60))
    and not exists (
      select 1 from public.booking_appointments a
      where a.card_id=v_card.id and a.kind='booking' and a.status='confirmed'
        and a.start_at < slot_start + make_interval(mins=>v_duration)
        and a.end_at > slot_start
    );

  return jsonb_build_object('ok',true,'slots',v_slots,'timezone',v_tz);
exception when invalid_parameter_value then
  return jsonb_build_object('ok',false,'reason','timezone_invalid','slots','[]'::jsonb);
end;
$$;

create or replace function public.booking_submit_request(
  p_slug text,
  p_service_id uuid,
  p_customer_name text,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_preferred_start_at timestamptz default null,
  p_message text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_card public.digital_cards%rowtype; v_settings public.booking_settings%rowtype; v_service_name text := 'General service'; v_id uuid; v_tz text;
begin
  select * into v_card from public.digital_cards where slug=trim(p_slug) and status='published' limit 1;
  if v_card.id is null then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  select * into v_settings from public.booking_settings where card_id=v_card.id and enabled=true;
  if v_settings.card_id is null then return jsonb_build_object('ok',false,'reason','disabled'); end if;
  if length(trim(coalesce(p_customer_name,''))) < 2 then return jsonb_build_object('ok',false,'reason','name_required'); end if;
  if nullif(trim(coalesce(p_customer_email,'')),'') is null and nullif(trim(coalesce(p_customer_phone,'')),'') is null then
    return jsonb_build_object('ok',false,'reason','contact_required');
  end if;
  if p_service_id is not null then
    select name into v_service_name from public.card_services where id=p_service_id and card_id=v_card.id and is_enabled=true;
    if v_service_name is null then return jsonb_build_object('ok',false,'reason','service_unavailable'); end if;
  end if;
  v_tz := coalesce(nullif(v_settings.timezone,''),'America/New_York');
  insert into public.booking_appointments(
    card_id,user_id,card_service_id,service_name,kind,customer_name,customer_email,customer_phone,message,preferred_start_at,timezone,status
  ) values (
    v_card.id,v_card.user_id,p_service_id,v_service_name,'request',left(trim(p_customer_name),120),nullif(left(trim(coalesce(p_customer_email,'')),180),''),nullif(left(trim(coalesce(p_customer_phone,'')),60),''),nullif(left(trim(coalesce(p_message,'')),1000),''),p_preferred_start_at,v_tz,'requested'
  ) returning id into v_id;
  return jsonb_build_object('ok',true,'request_id',v_id,'message','Request sent');
end;
$$;

create or replace function public.booking_create_appointment(
  p_slug text,
  p_service_id uuid,
  p_start_at timestamptz,
  p_customer_name text,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_message text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_card public.digital_cards%rowtype;
  v_settings public.booking_settings%rowtype;
  v_avail public.booking_availability%rowtype;
  v_plan text;
  v_limit integer;
  v_duration integer;
  v_service_name text;
  v_payment_url text;
  v_tz text;
  v_local timestamp;
  v_local_date date;
  v_local_time time;
  v_start timestamptz;
  v_end timestamptz;
  v_step integer;
  v_offset_minutes integer;
  v_id uuid;
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
    from public.card_services s
    left join public.booking_service_settings bss on bss.card_service_id=s.id
    where s.card_id=v_card.id and s.is_enabled=true and coalesce(bss.enabled,true)=true
    order by s.sort_order,s.name limit v_limit
  ) q where q.id=p_service_id;
  if v_duration is null then return jsonb_build_object('ok',false,'reason','service_unavailable'); end if;

  v_tz := coalesce(nullif(v_settings.timezone,''),'America/New_York');
  v_local := p_start_at at time zone v_tz;
  v_local_date := v_local::date;
  v_local_time := v_local::time;
  if v_local_date < (now() at time zone v_tz)::date or v_local_date > ((now() at time zone v_tz)::date + v_settings.days_ahead) then
    return jsonb_build_object('ok',false,'reason','slot_unavailable');
  end if;
  if p_start_at < now() + make_interval(mins=>coalesce(v_settings.min_notice_minutes,60)) then
    return jsonb_build_object('ok',false,'reason','slot_unavailable');
  end if;
  select * into v_avail from public.booking_availability
    where card_id=v_card.id and weekday=extract(dow from v_local_date)::smallint and enabled=true limit 1;
  if v_avail.id is null or v_local_time < v_avail.start_time or (v_local_time + make_interval(mins=>v_duration)) > v_avail.end_time then
    return jsonb_build_object('ok',false,'reason','slot_unavailable');
  end if;
  v_step := greatest(15,v_duration+coalesce(v_settings.buffer_minutes,0));
  v_offset_minutes := floor(extract(epoch from (v_local_time-v_avail.start_time))/60)::integer;
  if v_offset_minutes < 0 or mod(v_offset_minutes,v_step) <> 0 then return jsonb_build_object('ok',false,'reason','slot_unavailable'); end if;

  v_start := p_start_at;
  v_end := p_start_at + make_interval(mins=>v_duration);
  perform pg_advisory_xact_lock(hashtext(v_card.id::text || ':' || v_local_date::text));
  if exists (
    select 1 from public.booking_appointments a
    where a.card_id=v_card.id and a.kind='booking' and a.status='confirmed'
      and a.start_at < v_end and a.end_at > v_start
  ) then return jsonb_build_object('ok',false,'reason','slot_taken'); end if;

  insert into public.booking_appointments(
    card_id,user_id,card_service_id,service_name,kind,customer_name,customer_email,customer_phone,message,start_at,end_at,timezone,status
  ) values (
    v_card.id,v_card.user_id,p_service_id,v_service_name,'booking',left(trim(p_customer_name),120),nullif(left(trim(coalesce(p_customer_email,'')),180),''),nullif(left(trim(coalesce(p_customer_phone,'')),60),''),nullif(left(trim(coalesce(p_message,'')),1000),''),v_start,v_end,v_tz,'confirmed'
  ) returning id into v_id;

  return jsonb_build_object(
    'ok',true,
    'appointment_id',v_id,
    'service_name',v_service_name,
    'start_at',to_char(v_start,'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'timezone',v_tz,
    'external_payment_url',case when v_plan in ('pro','agency','white_label') then nullif(trim(coalesce(v_payment_url,'')),'') else null end
  );
exception when invalid_parameter_value then
  return jsonb_build_object('ok',false,'reason','timezone_invalid');
end;
$$;

revoke all on public.booking_settings from anon;
revoke all on public.booking_availability from anon;
revoke all on public.booking_service_settings from anon;
revoke all on public.booking_appointments from anon;
grant select,insert,update,delete on public.booking_settings to authenticated;
grant select,insert,update,delete on public.booking_availability to authenticated;
grant select,insert,update,delete on public.booking_service_settings to authenticated;
grant select,update,delete on public.booking_appointments to authenticated;

revoke all on function public.liw_booking_plan_for_user(uuid) from public;
revoke all on function public.booking_public_bootstrap(text) from public;
revoke all on function public.booking_available_slots(text,uuid,date) from public;
revoke all on function public.booking_submit_request(text,uuid,text,text,text,timestamptz,text) from public;
revoke all on function public.booking_create_appointment(text,uuid,timestamptz,text,text,text,text) from public;
grant execute on function public.booking_public_bootstrap(text) to anon, authenticated;
grant execute on function public.booking_available_slots(text,uuid,date) to anon, authenticated;
grant execute on function public.booking_submit_request(text,uuid,text,text,text,timestamptz,text) to anon, authenticated;
grant execute on function public.booking_create_appointment(text,uuid,timestamptz,text,text,text,text) to anon, authenticated;