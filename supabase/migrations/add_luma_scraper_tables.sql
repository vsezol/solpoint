-- Migration: Luma scraper tables
-- Tables for scraped Luma events and attendees (luma_events, luma_users, luma_event_attendees)

-- 1. Luma events (scraped from calendar pages)
CREATE TABLE IF NOT EXISTS public.luma_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL UNIQUE,
  slug TEXT,
  title TEXT,
  description TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  location TEXT,
  address TEXT,
  organizer TEXT,
  image_url TEXT,
  participant_count INTEGER,
  calendar_slug TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_luma_events_url ON public.luma_events(url);
CREATE INDEX IF NOT EXISTS idx_luma_events_slug ON public.luma_events(slug);
CREATE INDEX IF NOT EXISTS idx_luma_events_calendar_slug ON public.luma_events(calendar_slug);
CREATE INDEX IF NOT EXISTS idx_luma_events_start_at ON public.luma_events(start_at);

COMMENT ON TABLE public.luma_events IS 'Events scraped from Luma calendar pages';

-- 2. Luma users (attendees, unique by Luma profile URL)
CREATE TABLE IF NOT EXISTS public.luma_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  luma_profile_url TEXT NOT NULL UNIQUE,
  name TEXT,
  social_links JSONB DEFAULT '{}',
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_luma_users_luma_profile_url ON public.luma_users(luma_profile_url);

COMMENT ON TABLE public.luma_users IS 'Luma users (attendees); social_links: twitter, linkedin, website, etc.';

-- 3. Junction: which users attend which events
CREATE TABLE IF NOT EXISTS public.luma_event_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.luma_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.luma_users(id) ON DELETE CASCADE,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_luma_event_attendees_event_id ON public.luma_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_luma_event_attendees_user_id ON public.luma_event_attendees(user_id);

COMMENT ON TABLE public.luma_event_attendees IS 'Many-to-many: Luma events and their attendees (Luma users)';

-- 4. RLS
ALTER TABLE public.luma_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.luma_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.luma_event_attendees ENABLE ROW LEVEL SECURITY;

-- Read: allow everyone (for public display of events/attendees)
CREATE POLICY "Luma events are readable by everyone"
  ON public.luma_events FOR SELECT USING (true);

CREATE POLICY "Luma users are readable by everyone"
  ON public.luma_users FOR SELECT USING (true);

CREATE POLICY "Luma event attendees are readable by everyone"
  ON public.luma_event_attendees FOR SELECT USING (true);

-- Write: admins only (scraper runs as admin / service role)
CREATE POLICY "Admins can manage luma_events"
  ON public.luma_events FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can manage luma_users"
  ON public.luma_users FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can manage luma_event_attendees"
  ON public.luma_event_attendees FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
