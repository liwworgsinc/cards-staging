-- LIW Cards — Appointments V2 staging reminder scheduler
create extension if not exists pg_cron;

do $$
declare v_job bigint;
begin
  for v_job in select jobid from cron.job where jobname='liw-booking-reminders-v2-staging' loop
    perform cron.unschedule(v_job);
  end loop;
end $$;

select cron.schedule(
  'liw-booking-reminders-v2-staging',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://nfwqcilqmqruysovjuyj.supabase.co/functions/v1/booking-reminders-v2',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-liw-cron-secret',(select secret_value from public.booking_system_secrets where secret_key='reminder_cron_secret')
    ),
    body := jsonb_build_object('environment','staging')
  );
  $job$
);
