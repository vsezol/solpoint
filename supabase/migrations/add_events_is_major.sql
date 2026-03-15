-- Migration: add manual "major event" flag for events page curation
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_major BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.events.is_major IS
  'Manual admin flag to pin event into the "Major events" section.';

CREATE INDEX IF NOT EXISTS idx_events_is_major_start_date
  ON public.events(is_major, start_date);
