# Scheduled Spark Reminder Netlify Cron

The Website/Admin Netlify site includes a server-side scheduled function that invokes the FaceMeet Supabase Edge Function:

`scheduled_spark_reminder_worker`

It runs every 5 minutes through Netlify Scheduled Functions and calls:

`$SUPABASE_PROJECT_URL/functions/v1/scheduled_spark_reminder_worker`

## Schedule

Cron expression:

`*/5 * * * *`

## Required Netlify Environment Variables

Set these in the Netlify site environment, not in frontend files and not in committed `.env` files:

- `SUPABASE_PROJECT_URL`: `https://vbaiivsvjdntzaffboue.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role key

Never commit, print, or expose the service-role key. The scheduled function reads it only from `process.env` on the Netlify server side.

## Verification

In Netlify:

- Open the production deploy logs and confirm the scheduled function is included.
- Check function logs for `scheduled-spark-reminder`.
- Manual invocation of `/.netlify/functions/scheduled-spark-reminder` should return JSON.

In Supabase:

- Confirm the `scheduled_spark_reminder_worker` function logs show periodic invocations.
- Confirm accepted schedules have reminder fields such as `reminder_sent_at` or `join_ready_sent_at` populated after the worker runs.

## Failure Modes

The function returns a safe JSON error if either required environment variable is missing. If the Supabase worker returns a non-2xx response, the function logs and returns only the worker status and a short response snippet. It does not log or return the service-role key.
