-- LIW Cards — Google Calendar sync for Appointments V2 (staging).
-- Applied to Supabase project nfwqcilqmqruysovjuyj.

create table public.booking_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google' check (provider in ('google')),
  account_email text,
  status text not null default 'connected' check (status in ('connected','reauth_required','disconnected','error')),
  scopes text[] not null default '{}'::text[],
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,provider)
);

create table public.booking_calendar_tokens (
  connection_id uuid primary key references public.booking_calendar_connections(id) on delete cascade,
  access_token text,
  refresh_token text,
  token_type text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.booking_card_calendar_settings (
  card_id uuid primary key references public.digital_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.booking_calendar_connections(id) on delete cascade,
  provider text not null default 'google' check (provider in ('google')),
  calendar_id text not null default 'primary',
  calendar_name text not null default 'Primary calendar',
  enabled boolean not null default true,
  block_busy boolean not null default true,
  push_bookings boolean not null default true,
  sync_changes boolean not null default true,
  environment text not null default 'staging' check (environment in ('staging','production')),
  last_busy_sync_at timestamptz,
  last_event_sync_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_calendar_busy (
  id bigint generated always as identity primary key,
  card_id uuid not null references public.digital_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google' check (provider in ('google')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.booking_appointment_calendar_links (
  appointment_id uuid primary key references public.booking_appointments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.booking_calendar_connections(id) on delete cascade,
  provider text not null default 'google' check (provider in ('google')),
  calendar_id text not null,
  provider_event_id text not null,
  event_html_link text,
  sync_status text not null default 'synced' check (sync_status in ('synced','pending','error','cancelled')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_calendar_oauth_states (
  state uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid references public.digital_cards(id) on delete cascade,
  provider text not null default 'google' check (provider in ('google')),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now()
);

create index booking_calendar_connections_user_idx on public.booking_calendar_connections(user_id);
create index booking_card_calendar_settings_user_idx on public.booking_card_calendar_settings(user_id);
create index booking_card_calendar_settings_connection_idx on public.booking_card_calendar_settings(connection_id);
create index booking_calendar_busy_card_time_idx on public.booking_calendar_busy(card_id,starts_at,ends_at);
create index booking_calendar_busy_user_idx on public.booking_calendar_busy(user_id);
create index booking_appointment_calendar_links_user_idx on public.booking_appointment_calendar_links(user_id);
create index booking_appointment_calendar_links_connection_idx on public.booking_appointment_calendar_links(connection_id);
create index booking_calendar_oauth_states_expiry_idx on public.booking_calendar_oauth_states(expires_at);

alter table public.booking_calendar_connections enable row level security;
alter table public.booking_calendar_tokens enable row level security;
alter table public.booking_card_calendar_settings enable row level security;
alter table public.booking_calendar_busy enable row level security;
alter table public.booking_appointment_calendar_links enable row level security;
alter table public.booking_calendar_oauth_states enable row level security;

create policy booking_calendar_connections_owner_select on public.booking_calendar_connections for select to authenticated using (auth.uid()=user_id);
create policy booking_card_calendar_settings_owner_select on public.booking_card_calendar_settings for select to authenticated using (auth.uid()=user_id);
create policy booking_calendar_busy_owner_select on public.booking_calendar_busy for select to authenticated using (auth.uid()=user_id);
create policy booking_appointment_calendar_links_owner_select on public.booking_appointment_calendar_links for select to authenticated using (auth.uid()=user_id);

grant select on public.booking_calendar_connections, public.booking_card_calendar_settings, public.booking_calendar_busy, public.booking_appointment_calendar_links to authenticated;
revoke all on public.booking_calendar_tokens from anon, authenticated;
revoke all on public.booking_calendar_oauth_states from anon, authenticated;
revoke all on public.booking_calendar_busy from anon;

create trigger booking_calendar_connections_touch_updated_at before update on public.booking_calendar_connections for each row execute function public.liw_booking_touch_updated_at();
create trigger booking_card_calendar_settings_touch_updated_at before update on public.booking_card_calendar_settings for each row execute function public.liw_booking_touch_updated_at();
create trigger booking_appointment_calendar_links_touch_updated_at before update on public.booking_appointment_calendar_links for each row execute function public.liw_booking_touch_updated_at();

insert into public.booking_system_secrets(secret_key,secret_value)
values('calendar_cron_secret',gen_random_uuid()::text||gen_random_uuid()::text)
on conflict (secret_key) do nothing;

create or replace function public.liw_calendar_busy_conflict(p_card_id uuid,p_start_at timestamptz,p_end_at timestamptz)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.booking_card_calendar_settings s
    join public.booking_calendar_busy b on b.card_id=s.card_id and b.provider=s.provider
    where s.card_id=p_card_id and s.enabled=true and s.block_busy=true
      and b.starts_at<p_end_at and b.ends_at>p_start_at
  );
$$;
revoke all on function public.liw_calendar_busy_conflict(uuid,timestamptz,timestamptz) from public,anon,authenticated;

-- Replace the V2 slot validator so synchronized Google busy intervals cannot be booked.
create or replace function public.liw_booking_slot_available(p_card_id uuid, p_service_id uuid, p_start_at timestamptz, p_exclude_appointment_id uuid default null)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare v_card public.digital_cards%rowtype; v_settings public.booking_settings%rowtype; v_avail public.booking_availability%rowtype; v_plan text; v_limit integer; v_duration integer; v_tz text; v_local timestamp; v_local_date date; v_local_time time; v_end timestamptz; v_step integer; v_offset_minutes integer;
begin
  select * into v_card from public.digital_cards where id=p_card_id limit 1; if v_card.id is null then return false; end if;
  v_plan:=public.liw_booking_plan_for_user(v_card.user_id); if v_plan in ('starter','free') then return false; end if;
  select * into v_settings from public.booking_settings where card_id=v_card.id and enabled=true; if v_settings.card_id is null then return false; end if;
  v_limit:=case when v_plan='lite' then 1 when v_plan='plus' then 5 else 100 end;
  select q.duration_minutes into v_duration from (select s.id,coalesce(bss.duration_minutes,30) duration_minutes from public.card_services s left join public.booking_service_settings bss on bss.card_service_id=s.id where s.card_id=v_card.id and s.is_enabled=true and coalesce(bss.enabled,true)=true order by s.sort_order,s.name limit v_limit) q where q.id=p_service_id;
  if v_duration is null then return false; end if;
  v_tz:=coalesce(nullif(v_settings.timezone,''),'America/New_York'); v_local:=p_start_at at time zone v_tz; v_local_date:=v_local::date; v_local_time:=v_local::time;
  if v_local_date < (now() at time zone v_tz)::date or v_local_date > ((now() at time zone v_tz)::date+v_settings.days_ahead) then return false; end if;
  if p_start_at < now()+make_interval(mins=>coalesce(v_settings.min_notice_minutes,60)) then return false; end if;
  select * into v_avail from public.booking_availability where card_id=v_card.id and weekday=extract(dow from v_local_date)::smallint and enabled=true limit 1;
  if v_avail.id is null or v_local_time<v_avail.start_time or (v_local_time+make_interval(mins=>v_duration))>v_avail.end_time then return false; end if;
  v_step:=greatest(15,v_duration+coalesce(v_settings.buffer_minutes,0)); v_offset_minutes:=floor(extract(epoch from (v_local_time-v_avail.start_time))/60)::integer;
  if v_offset_minutes<0 or mod(v_offset_minutes,v_step)<>0 then return false; end if;
  v_end:=p_start_at+make_interval(mins=>v_duration);
  if exists(select 1 from public.booking_blackouts b where b.card_id=v_card.id and b.starts_at<v_end and b.ends_at>p_start_at) then return false; end if;
  if public.liw_calendar_busy_conflict(v_card.id,p_start_at,v_end) then return false; end if;
  if exists(select 1 from public.booking_appointments a where a.card_id=v_card.id and a.kind='booking' and a.status='confirmed' and (p_exclude_appointment_id is null or a.id<>p_exclude_appointment_id) and a.start_at<v_end and a.end_at>p_start_at) then return false; end if;
  return true;
exception when invalid_parameter_value then return false;
end;
$$;

create or replace function public.booking_available_slots(p_slug text,p_service_id uuid,p_date date)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_card public.digital_cards%rowtype; v_settings public.booking_settings%rowtype; v_avail public.booking_availability%rowtype; v_plan text; v_limit integer; v_duration integer; v_step integer; v_tz text; v_start timestamptz; v_end timestamptz; v_slots jsonb:='[]'::jsonb;
begin
  select * into v_card from public.digital_cards where slug=trim(p_slug) and status='published' limit 1; if v_card.id is null then return jsonb_build_object('ok',false,'reason','not_found','slots','[]'::jsonb); end if;
  v_plan:=public.liw_booking_plan_for_user(v_card.user_id); if v_plan in ('starter','free') then return jsonb_build_object('ok',false,'reason','request_only','slots','[]'::jsonb); end if;
  select * into v_settings from public.booking_settings where card_id=v_card.id and enabled=true; if v_settings.card_id is null then return jsonb_build_object('ok',false,'reason','disabled','slots','[]'::jsonb); end if;
  v_tz:=coalesce(nullif(v_settings.timezone,''),'America/New_York');
  if p_date<(now() at time zone v_tz)::date or p_date>((now() at time zone v_tz)::date+v_settings.days_ahead) then return jsonb_build_object('ok',true,'slots','[]'::jsonb); end if;
  v_limit:=case when v_plan='lite' then 1 when v_plan='plus' then 5 else 100 end;
  select q.duration_minutes into v_duration from (select s.id,coalesce(bss.duration_minutes,30) duration_minutes from public.card_services s left join public.booking_service_settings bss on bss.card_service_id=s.id where s.card_id=v_card.id and s.is_enabled=true and coalesce(bss.enabled,true)=true order by s.sort_order,s.name limit v_limit) q where q.id=p_service_id;
  if v_duration is null then return jsonb_build_object('ok',false,'reason','service_unavailable','slots','[]'::jsonb); end if;
  select * into v_avail from public.booking_availability where card_id=v_card.id and weekday=extract(dow from p_date)::smallint and enabled=true limit 1;
  if v_avail.id is null then return jsonb_build_object('ok',true,'slots','[]'::jsonb); end if;
  v_start:=(p_date+v_avail.start_time)::timestamp at time zone v_tz; v_end:=(p_date+v_avail.end_time)::timestamp at time zone v_tz; v_step:=greatest(15,v_duration+coalesce(v_settings.buffer_minutes,0));
  select coalesce(jsonb_agg(jsonb_build_object('start_at',to_char(slot_start,'YYYY-MM-DD"T"HH24:MI:SSOF'),'label',to_char(slot_start at time zone v_tz,'FMHH12:MI AM')) order by slot_start),'[]'::jsonb) into v_slots
  from generate_series(v_start,v_end-make_interval(mins=>v_duration),make_interval(mins=>v_step)) slot_start
  where slot_start>=now()+make_interval(mins=>coalesce(v_settings.min_notice_minutes,60))
    and not exists(select 1 from public.booking_appointments a where a.card_id=v_card.id and a.kind='booking' and a.status='confirmed' and a.start_at<slot_start+make_interval(mins=>v_duration) and a.end_at>slot_start)
    and not exists(select 1 from public.booking_blackouts b where b.card_id=v_card.id and b.starts_at<slot_start+make_interval(mins=>v_duration) and b.ends_at>slot_start)
    and not public.liw_calendar_busy_conflict(v_card.id,slot_start,slot_start+make_interval(mins=>v_duration));
  return jsonb_build_object('ok',true,'slots',v_slots,'timezone',v_tz);
exception when invalid_parameter_value then return jsonb_build_object('ok',false,'reason','timezone_invalid','slots','[]'::jsonb);
end;
$$;
grant execute on function public.booking_available_slots(text,uuid,date) to anon,authenticated;
