-- LIW Cards — private server-to-server auth for the staging reminder worker.
create table if not exists public.booking_system_secrets (
  secret_key text primary key,
  secret_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.booking_system_secrets(secret_key,secret_value)
values('reminder_cron_secret',gen_random_uuid()::text)
on conflict(secret_key) do nothing;

revoke all on public.booking_system_secrets from public,anon,authenticated;
alter table public.booking_system_secrets enable row level security;
