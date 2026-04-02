-- Full metadata for luma_events, parse error logging, and event organizers table

-- 1. Extend luma_events: location coordinates + parse error log
-- location = venue name, address = full address (existing)
ALTER TABLE public.luma_events
  ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_place_id TEXT,
  ADD COLUMN IF NOT EXISTS location_source TEXT,
  ADD COLUMN IF NOT EXISTS meta_parse_errors JSONB DEFAULT '{}';

COMMENT ON COLUMN public.luma_events.location IS 'Venue/place name from Luma';
COMMENT ON COLUMN public.luma_events.address IS 'Full address string';
COMMENT ON COLUMN public.luma_events.location_lat IS 'Latitude from embedded map or Google Maps link';
COMMENT ON COLUMN public.luma_events.location_lng IS 'Longitude from embedded map or Google Maps link';
COMMENT ON COLUMN public.luma_events.location_place_id IS 'Google Place ID when available';
COMMENT ON COLUMN public.luma_events.location_source IS 'e.g. embedded_map or gmaps_link';
COMMENT ON COLUMN public.luma_events.meta_parse_errors IS 'Fields that failed to parse: { "field": "reason", ... }. Empty when all metadata parsed successfully. Used to avoid setting META_PARSED until all required fields are present.';

-- 2. Event organizers (many-to-many: same luma_users, different relation than attendees)
CREATE TABLE IF NOT EXISTS public.luma_event_organizers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.luma_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.luma_users(id) ON DELETE CASCADE,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_luma_event_organizers_event_id ON public.luma_event_organizers(event_id);
CREATE INDEX IF NOT EXISTS idx_luma_event_organizers_user_id ON public.luma_event_organizers(user_id);

COMMENT ON TABLE public.luma_event_organizers IS 'Event hosts/organizers (Luma users). Many-to-many with luma_events.';

-- 3. RLS for luma_event_organizers
ALTER TABLE public.luma_event_organizers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Luma event organizers are readable by everyone"
  ON public.luma_event_organizers FOR SELECT USING (true);

CREATE POLICY "Admins can manage luma_event_organizers"
  ON public.luma_event_organizers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
