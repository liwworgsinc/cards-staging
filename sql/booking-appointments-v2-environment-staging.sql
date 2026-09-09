-- LIW Cards — Appointments V2 staging environment guard
begin;

alter table public.booking_appointments
  add column if not exists source_environment text not null default 'production';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='booking_appointments_source_environment_check'
      and conrelid='public.booking_appointments'::regclass
  ) then
    alter table public.booking_appointments
      add constraint booking_appointments_source_environment_check
      check (source_environment in ('production','staging'));
  end if;
end $$;

create index if not exists booking_appointments_reminder_due_idx
  on public.booking_appointments(source_environment,status,start_at)
  where kind='booking' and customer_email is not null;

create or replace function public.booking_create_appointment_v2(
  p_slug text,
  p_service_id uuid,
  p_start_at timestamptz,
  p_customer_name text,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_message text default null,
  p_environment text default 'staging'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_result jsonb;
  v_id uuid;
  v_environment text;
begin
  v_environment := case when lower(trim(coalesce(p_environment,'')))='production' then 'production' else 'staging' end;
  v_result := public.booking_create_appointment(
    p_slug,p_service_id,p_start_at,p_customer_name,p_customer_email,p_customer_phone,p_message
  );
  if coalesce((v_result->>'ok')::boolean,false) and nullif(v_result->>'appointment_id','') is not null then
    v_id := (v_result->>'appointment_id')::uuid;
    update public.booking_appointments
      set source_environment=v_environment
      where id=v_id;
  end if;
  return v_result || jsonb_build_object('source_environment',v_environment);
end;
$$;

revoke all on function public.booking_create_appointment_v2(text,uuid,timestamptz,text,text,text,text,text) from public;
grant execute on function public.booking_create_appointment_v2(text,uuid,timestamptz,text,text,text,text,text) to anon,authenticated;

commit;
