-- LIW Cards — reconcile Google Calendar connections every two minutes in staging.
do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='liw-google-calendar-sync-staging' limit 1;
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
  perform cron.schedule(
    'liw-google-calendar-sync-staging',
    '*/2 * * * *',
    $cron$select net.http_post(
      url := 'https://nfwqcilqmqruysovjuyj.supabase.co/functions/v1/google-calendar-sync',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-liw-cron-secret',(select secret_value from public.booking_system_secrets where secret_key='calendar_cron_secret')
      ),
      body := jsonb_build_object('action','cron','environment','staging')
    );$cron$
  );
end $$;
