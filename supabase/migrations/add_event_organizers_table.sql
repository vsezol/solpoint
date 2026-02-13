-- Multiple organizers per event (SolPoint profiles or Luma users)
-- Used for display; owner_id on events = who can edit (one owner)

CREATE TABLE IF NOT EXISTS public.event_organizers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  luma_user_id UUID REFERENCES public.luma_users(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT event_organizers_one_source CHECK (
    (profile_id IS NOT NULL AND luma_user_id IS NULL)
    OR (profile_id IS NULL AND luma_user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_event_organizers_event_id ON public.event_organizers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_organizers_profile_id ON public.event_organizers(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_organizers_luma_user_id ON public.event_organizers(luma_user_id) WHERE luma_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_organizers_event_profile ON public.event_organizers(event_id, profile_id) WHERE profile_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_organizers_event_luma ON public.event_organizers(event_id, luma_user_id) WHERE luma_user_id IS NOT NULL;

COMMENT ON TABLE public.event_organizers IS 'Organizers/hosts of an event. Either our user (profile_id) or Luma user (luma_user_id). For display only; events.owner_id = who can edit.';

ALTER TABLE public.event_organizers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event organizers are readable by everyone"
  ON public.event_organizers FOR SELECT USING (true);

CREATE POLICY "Event owners and admins can manage event organizers"
  ON public.event_organizers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_organizers.event_id
      AND (
        (e.owner_id IS NOT NULL AND (
          (e.owner_type = 'user' AND e.owner_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.hubs h WHERE h.id = e.owner_id AND h.owner_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = e.owner_id AND c.owner_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = e.owner_id AND p.owner_id = auth.uid())
        ))
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_organizers.event_id
      AND (
        (e.owner_id IS NOT NULL AND (
          (e.owner_type = 'user' AND e.owner_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.hubs h WHERE h.id = e.owner_id AND h.owner_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = e.owner_id AND c.owner_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = e.owner_id AND p.owner_id = auth.uid())
        ))
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      )
    )
  );
