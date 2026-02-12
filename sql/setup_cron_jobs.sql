-- Setup scheduled jobs to run ingest_and_score 4 times per day
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql
--
-- BEFORE RUNNING: Replace these values:
--   - ppewvxkyqyoiprpnphje  → your Supabase project ref (if different)
--   - YOUR_SERVICE_ROLE_KEY → your service role key from Settings → API

-- Step 1: Enable extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: (Optional) Remove existing jobs if re-running - uncomment and run first:
-- SELECT cron.unschedule('ingest-6am');
-- SELECT cron.unschedule('ingest-11am');
-- SELECT cron.unschedule('ingest-4pm');
-- SELECT cron.unschedule('ingest-9pm');

-- Step 3: Create cron jobs (4 runs per day: 6am, 11am, 4pm, 9pm Pacific)
-- Times are in UTC. For Pacific: 6am PDT = 13:00 UTC, 11am = 18:00, 4pm = 23:00, 9pm = 04:00

SELECT cron.schedule(
  'ingest-6am',
  '0 13 * * *',
  $$
  SELECT net.http_get(
    url := 'https://ppewvxkyqyoiprpnphje.supabase.co/functions/v1/ingest_and_score',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    )
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'ingest-11am',
  '0 18 * * *',
  $$
  SELECT net.http_get(
    url := 'https://ppewvxkyqyoiprpnphje.supabase.co/functions/v1/ingest_and_score',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    )
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'ingest-4pm',
  '0 23 * * *',
  $$
  SELECT net.http_get(
    url := 'https://ppewvxkyqyoiprpnphje.supabase.co/functions/v1/ingest_and_score',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    )
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'ingest-9pm',
  '0 4 * * *',
  $$
  SELECT net.http_get(
    url := 'https://ppewvxkyqyoiprpnphje.supabase.co/functions/v1/ingest_and_score',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    )
  ) AS request_id;
  $$
);

-- Step 4: Verify jobs were created
SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname LIKE 'ingest-%';
