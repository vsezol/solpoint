-- Events from Luma: luma_event_id ref + nullable owner (no owner until claimed)
-- source for API: 'solpoint' when luma_event_id is null, 'external' when set

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS luma_event_id UUID REFERENCES public.luma_events(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.events.luma_event_id IS 'Set when event was synced from Luma; used for internal/external source and fetching Luma attendees. NULL = SolPoint-native event.';

-- Allow owner_id to be NULL for external (Luma-synced) events that are not yet claimed
ALTER TABLE public.events
  ALTER COLUMN owner_id DROP NOT NULL;

-- owner_type can stay NOT NULL; for external events we still set owner_type = 'user' and owner_id = null
-- (or we could allow owner_type null - but then all code that reads owner_type must handle null)
-- So: keep owner_type NOT NULL, use e.g. owner_type = 'user' and owner_id = null for "unclaimed external"

-- Admins can update events that have no owner (external/unclaimed)
DROP POLICY IF EXISTS "Owners can update their events" ON public.events;
CREATE POLICY "Owners can update their events"
  ON public.events FOR UPDATE
  USING (
    (owner_id IS NOT NULL AND (
      (owner_type = 'user' AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.hubs WHERE id = events.owner_id AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.communities WHERE id = events.owner_id AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.projects WHERE id = events.owner_id AND owner_id = auth.uid())
    ))
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX IF NOT EXISTS idx_events_luma_event_id ON public.events(luma_event_id) WHERE luma_event_id IS NOT NULL;
