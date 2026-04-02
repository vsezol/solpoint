-- Migration: add feedback messages table for landing contact form
-- Description: stores unauthenticated contact/support messages sent from landing page

CREATE TABLE IF NOT EXISTS public.feedback_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  email TEXT NOT NULL CHECK (char_length(email) <= 255),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 3 AND 2000),
  source TEXT NOT NULL DEFAULT 'landing_contact_support',
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_messages_created_at
  ON public.feedback_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_messages_email
  ON public.feedback_messages(email);

ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;

-- Keep table private for direct client access.
-- Inserts happen through server route with service role key.

DROP TRIGGER IF EXISTS feedback_messages_updated_at ON public.feedback_messages;
CREATE TRIGGER feedback_messages_updated_at
BEFORE UPDATE ON public.feedback_messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
