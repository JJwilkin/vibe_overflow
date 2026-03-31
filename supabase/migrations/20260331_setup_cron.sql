-- Enable the required extensions
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Schedule the process-jobs edge function to run every minute
-- This uses pg_net to make an HTTP request to the edge function
select cron.schedule(
  'process-ai-jobs',
  '* * * * *',  -- every minute
  $$
  select
    net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/process-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
