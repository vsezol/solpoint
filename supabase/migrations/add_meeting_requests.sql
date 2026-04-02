-- Meeting requests MVP (PRO-only)

CREATE TABLE IF NOT EXISTS public.meeting_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  current_proposal_id UUID NULL,
  awaiting_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_action_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_at TIMESTAMPTZ NULL,
  rejected_at TIMESTAMPTZ NULL,
  pair_user_low UUID GENERATED ALWAYS AS (LEAST(requester_id, responder_id)) STORED,
  pair_user_high UUID GENERATED ALWAYS AS (GREATEST(requester_id, responder_id)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requester_id <> responder_id)
);

CREATE TABLE IF NOT EXISTS public.meeting_request_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_request_id UUID NOT NULL REFERENCES public.meeting_requests(id) ON DELETE CASCADE,
  proposed_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_at > start_at)
);

ALTER TABLE public.meeting_requests
  ADD CONSTRAINT meeting_requests_current_proposal_id_fkey
  FOREIGN KEY (current_proposal_id)
  REFERENCES public.meeting_request_proposals(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.meeting_request_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_request_id UUID NOT NULL REFERENCES public.meeting_requests(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'approved', 'rejected', 'rescheduled')),
  proposal_id UUID NULL REFERENCES public.meeting_request_proposals(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_requests_responder_status
  ON public.meeting_requests(responder_id, status);

CREATE INDEX IF NOT EXISTS idx_meeting_requests_awaiting_status
  ON public.meeting_requests(awaiting_user_id, status);

CREATE INDEX IF NOT EXISTS idx_meeting_requests_event
  ON public.meeting_requests(event_id);

CREATE INDEX IF NOT EXISTS idx_meeting_request_proposals_request_created
  ON public.meeting_request_proposals(meeting_request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_request_events_target_read_created
  ON public.meeting_request_events(target_user_id, is_read, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_requests_unique_active_pair_per_event
  ON public.meeting_requests(event_id, pair_user_low, pair_user_high)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.set_meeting_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_meeting_requests_updated_at_trigger ON public.meeting_requests;

CREATE TRIGGER set_meeting_requests_updated_at_trigger
BEFORE UPDATE ON public.meeting_requests
FOR EACH ROW EXECUTE FUNCTION public.set_meeting_requests_updated_at();

ALTER TABLE public.meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_request_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Meeting participants can view requests"
  ON public.meeting_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = responder_id);

CREATE POLICY "PRO users can create meeting requests"
  ON public.meeting_requests FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
    AND requester_id <> responder_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.subscription_tier = 'vip'
    )
    AND EXISTS (
      SELECT 1
      FROM public.event_members em
      WHERE em.event_id = event_id
      AND em.user_id = requester_id
      AND em.status = 'going'
    )
    AND EXISTS (
      SELECT 1
      FROM public.event_members em
      WHERE em.event_id = event_id
      AND em.user_id = responder_id
      AND em.status = 'going'
    )
  );

CREATE POLICY "Meeting participants can update requests"
  ON public.meeting_requests FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = responder_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = responder_id);

CREATE POLICY "Meeting participants can view proposals"
  ON public.meeting_request_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.meeting_requests mr
      WHERE mr.id = meeting_request_proposals.meeting_request_id
      AND (mr.requester_id = auth.uid() OR mr.responder_id = auth.uid())
    )
  );

CREATE POLICY "Meeting participants can create proposals"
  ON public.meeting_request_proposals FOR INSERT
  WITH CHECK (
    auth.uid() = proposed_by_user_id
    AND EXISTS (
      SELECT 1
      FROM public.meeting_requests mr
      WHERE mr.id = meeting_request_id
      AND (mr.requester_id = auth.uid() OR mr.responder_id = auth.uid())
    )
  );

CREATE POLICY "Meeting participants can view request events"
  ON public.meeting_request_events FOR SELECT
  USING (auth.uid() = target_user_id OR auth.uid() = actor_id);

CREATE POLICY "Meeting participants can create request events"
  ON public.meeting_request_events FOR INSERT
  WITH CHECK (
    auth.uid() = actor_id
    AND EXISTS (
      SELECT 1
      FROM public.meeting_requests mr
      WHERE mr.id = meeting_request_id
      AND (mr.requester_id = auth.uid() OR mr.responder_id = auth.uid())
    )
  );

CREATE POLICY "Users can mark own request events as read"
  ON public.meeting_request_events FOR UPDATE
  USING (auth.uid() = target_user_id)
  WITH CHECK (auth.uid() = target_user_id);
