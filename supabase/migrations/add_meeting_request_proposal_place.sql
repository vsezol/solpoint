-- Add place to meeting_request_proposals (optional meeting location)

ALTER TABLE public.meeting_request_proposals
  ADD COLUMN IF NOT EXISTS place TEXT;
