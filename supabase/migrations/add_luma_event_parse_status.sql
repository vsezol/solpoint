-- Add event parse state machine: status, timestamps, avatar on users

DO $$ BEGIN
  CREATE TYPE public.luma_event_parse_status AS ENUM (
    'DISCOVERED',
    'META_PARSED',
    'JOINED',
    'GUESTS_PARSED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.luma_events
  ADD COLUMN IF NOT EXISTS status luma_event_parse_status DEFAULT 'DISCOVERED',
  ADD COLUMN IF NOT EXISTS meta_parsed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS guests_parsed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_luma_events_status ON public.luma_events(status);

-- Event cover (обложка) is already in luma_events.image_url; scraper fills it from .cover-image-wrapper img
COMMENT ON COLUMN public.luma_events.image_url IS 'Event cover image URL from Luma (.cover-image-wrapper img)';

ALTER TABLE public.luma_users ADD COLUMN IF NOT EXISTS avatar TEXT;

COMMENT ON COLUMN public.luma_events.status IS 'Parse state: DISCOVERED (link saved), META_PARSED, JOINED (One-Click clicked), GUESTS_PARSED, FAILED';
COMMENT ON COLUMN public.luma_users.avatar IS 'Profile/avatar image URL from Luma';
