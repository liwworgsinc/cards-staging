-- LIW Cards staging Email Growth / nurture editor.
-- Applied to LIW Digital Cards Supabase on 2026-09-16.
-- Customer delivery is intentionally disabled in this staging phase.

create table if not exists public.staging_growth_email_sequences (
  sequence_key text primary key,
  label text not null,
  enabled boolean not null default false,
  delay_hours integer not null default 0 check (delay_hours >= 0),
  subject text not null,
  body_text text not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.staging_growth_email_log (
  id uuid primary key default gen_random_uuid(),
  sequence_key text not null references public.staging_growth_email_sequences(sequence_key) on delete restrict,
  recipient_email text not null,
  send_type text not null default 'test' check (send_type in ('test','nurture')),
  status text not null check (status in ('sent','failed')),
  provider_message_id text,
  provider_error text,
  sent_by uuid,
  created_at timestamptz not null default now()
);

alter table public.staging_growth_email_sequences enable row level security;
alter table public.staging_growth_email_log enable row level security;

revoke all on public.staging_growth_email_sequences from anon;
revoke all on public.staging_growth_email_log from anon;
grant select, insert, update, delete on public.staging_growth_email_sequences to authenticated;
grant select on public.staging_growth_email_log to authenticated;

create policy "staging growth email sequences admin only"
  on public.staging_growth_email_sequences for all to authenticated
  using ((select is_admin())) with check ((select is_admin()));

create policy "staging growth email log admin read"
  on public.staging_growth_email_log for select to authenticated
  using ((select is_admin()));
