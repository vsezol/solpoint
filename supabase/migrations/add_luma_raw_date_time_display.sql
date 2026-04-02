-- Store raw date/time string from Luma (e.g. "четверг, 12 февраля, 10:00 - 15:00 GMT+1")
ALTER TABLE public.luma_events
  ADD COLUMN IF NOT EXISTS raw_date_time_display TEXT;

COMMENT ON COLUMN public.luma_events.raw_date_time_display IS 'Raw date and time string as shown on Luma (date + time range + timezone, e.g. "Thursday, 12 February, 10:00 - 15:00 GMT+1")';
