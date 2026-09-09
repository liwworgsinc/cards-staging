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
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5md3FjaWxxbXFydXlzb3ZqdXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNzA3ODcsImV4cCI6MjEwMDY0Njc4N30.B_qZG7TP23TI1O4W_3V3vsptCT9QYontUX4kKuitvbs'
    ),
    body := jsonb_build_object('environment','staging')
  );
  $job$
);
