-- Track anonymous and authenticated website visit sessions for admin analytics

CREATE TABLE IF NOT EXISTS public.site_visit_sessions (
  session_id TEXT PRIMARY KEY,
  registered_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page_views INTEGER NOT NULL DEFAULT 1 CHECK (page_views >= 1),
  last_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_visit_sessions_registered_user_id
  ON public.site_visit_sessions(registered_user_id);

CREATE INDEX IF NOT EXISTS idx_site_visit_sessions_last_seen_at
  ON public.site_visit_sessions(last_seen_at DESC);

ALTER TABLE public.site_visit_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read site visit sessions" ON public.site_visit_sessions;
CREATE POLICY "Admins can read site visit sessions"
ON public.site_visit_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  )
);
