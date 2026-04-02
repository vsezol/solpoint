-- Profile QR module foundation + rewards scaffolding

CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('profile', 'event_checkin')),
  public_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  profile_id UUID NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NULL REFERENCES public.events(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rotation_minutes INTEGER NULL CHECK (rotation_minutes IS NULL OR rotation_minutes > 0),
  signing_key_version SMALLINT NOT NULL DEFAULT 1,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT qr_codes_target_check CHECK (
    (type = 'profile' AND profile_id IS NOT NULL AND event_id IS NULL)
    OR (type = 'event_checkin' AND event_id IS NOT NULL AND profile_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_codes_public_token
  ON public.qr_codes(public_token);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_codes_active_profile
  ON public.qr_codes(profile_id)
  WHERE type = 'profile' AND is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_codes_active_event_checkin
  ON public.qr_codes(event_id)
  WHERE type = 'event_checkin' AND is_active = true;

CREATE TABLE IF NOT EXISTS public.profile_qr_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code_id UUID NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  scan_session_id UUID NOT NULL,
  scanned_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scanner_profile_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  landed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  authenticated_at TIMESTAMPTZ NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_qr_scans_not_self CHECK (
    scanner_profile_id IS NULL OR scanner_profile_id <> scanned_profile_id
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_qr_scans_session
  ON public.profile_qr_scans(qr_code_id, scan_session_id);

CREATE INDEX IF NOT EXISTS idx_profile_qr_scans_scanned_profile
  ON public.profile_qr_scans(scanned_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_qr_scans_scanner_profile
  ON public.profile_qr_scans(scanner_profile_id, created_at DESC)
  WHERE scanner_profile_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.profile_qr_connect_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code_id UUID NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  scan_id UUID NULL REFERENCES public.profile_qr_scans(id) ON DELETE SET NULL,
  requester_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  follow_id UUID NULL REFERENCES public.follows(id) ON DELETE SET NULL,
  result_status TEXT NOT NULL CHECK (
    result_status IN ('pending_sent', 'accepted', 'already_pending', 'already_connected')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_qr_connect_events_not_self CHECK (
    requester_profile_id <> target_profile_id
  )
);

CREATE INDEX IF NOT EXISTS idx_profile_qr_connect_events_requester
  ON public.profile_qr_connect_events(requester_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_qr_connect_events_target
  ON public.profile_qr_connect_events(target_profile_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_qr_connect_events_follow_id
  ON public.profile_qr_connect_events(follow_id)
  WHERE follow_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.reward_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('event', 'system')),
  scope_id UUID NULL,
  code TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('badge', 'nft')),
  title TEXT NOT NULL,
  description TEXT NULL,
  image_url TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reward_definitions_scope_check CHECK (
    scope_type <> 'event' OR scope_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_definitions_scope_code
  ON public.reward_definitions(scope_type, scope_id, code);

CREATE TABLE IF NOT EXISTS public.reward_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reward_definition_id UUID NOT NULL REFERENCES public.reward_definitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NULL REFERENCES public.events(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('event_checkin', 'manual', 'migration')),
  source_ref_id UUID NULL,
  status TEXT NOT NULL CHECK (status IN ('earned', 'claimable', 'mint_pending', 'minted', 'revoked')),
  wallet_address_snapshot TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_grants_unique_source
  ON public.reward_grants(reward_definition_id, user_id, event_id, source_type);

CREATE INDEX IF NOT EXISTS idx_reward_grants_user_id
  ON public.reward_grants(user_id, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_reward_grants_event_id
  ON public.reward_grants(event_id, earned_at DESC)
  WHERE event_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_qr_module_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_qr_codes_updated_at_trigger ON public.qr_codes;
CREATE TRIGGER set_qr_codes_updated_at_trigger
BEFORE UPDATE ON public.qr_codes
FOR EACH ROW EXECUTE FUNCTION public.set_qr_module_updated_at();

DROP TRIGGER IF EXISTS set_reward_definitions_updated_at_trigger ON public.reward_definitions;
CREATE TRIGGER set_reward_definitions_updated_at_trigger
BEFORE UPDATE ON public.reward_definitions
FOR EACH ROW EXECUTE FUNCTION public.set_qr_module_updated_at();

DROP TRIGGER IF EXISTS set_reward_grants_updated_at_trigger ON public.reward_grants;
CREATE TRIGGER set_reward_grants_updated_at_trigger
BEFORE UPDATE ON public.reward_grants
FOR EACH ROW EXECUTE FUNCTION public.set_qr_module_updated_at();

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_qr_connect_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active profile QR codes" ON public.qr_codes;
CREATE POLICY "Public can read active profile QR codes"
  ON public.qr_codes FOR SELECT
  USING (type = 'profile' AND is_active = true);

DROP POLICY IF EXISTS "Users can create own profile QR codes" ON public.qr_codes;
CREATE POLICY "Users can create own profile QR codes"
  ON public.qr_codes FOR INSERT
  WITH CHECK (auth.uid() = profile_id AND type = 'profile');

DROP POLICY IF EXISTS "Users can update own profile QR codes" ON public.qr_codes;
CREATE POLICY "Users can update own profile QR codes"
  ON public.qr_codes FOR UPDATE
  USING (auth.uid() = profile_id AND type = 'profile')
  WITH CHECK (auth.uid() = profile_id AND type = 'profile');

DROP POLICY IF EXISTS "Users can view scans of their profile QR" ON public.profile_qr_scans;
CREATE POLICY "Users can view scans of their profile QR"
  ON public.profile_qr_scans FOR SELECT
  USING (auth.uid() = scanned_profile_id);

DROP POLICY IF EXISTS "Anyone can create profile QR scans" ON public.profile_qr_scans;
CREATE POLICY "Anyone can create profile QR scans"
  ON public.profile_qr_scans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.qr_codes q
      WHERE q.id = qr_code_id
      AND q.type = 'profile'
      AND q.is_active = true
      AND q.profile_id = scanned_profile_id
    )
    AND (scanner_profile_id IS NULL OR scanner_profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can update profile QR scans" ON public.profile_qr_scans;
CREATE POLICY "Anyone can update profile QR scans"
  ON public.profile_qr_scans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.qr_codes q
      WHERE q.id = qr_code_id
      AND q.type = 'profile'
      AND q.is_active = true
      AND q.profile_id = scanned_profile_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.qr_codes q
      WHERE q.id = qr_code_id
      AND q.type = 'profile'
      AND q.is_active = true
      AND q.profile_id = scanned_profile_id
    )
    AND (scanner_profile_id IS NULL OR scanner_profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own QR connect events" ON public.profile_qr_connect_events;
CREATE POLICY "Users can view own QR connect events"
  ON public.profile_qr_connect_events FOR SELECT
  USING (auth.uid() = requester_profile_id OR auth.uid() = target_profile_id);

DROP POLICY IF EXISTS "Authenticated users can create QR connect events" ON public.profile_qr_connect_events;
CREATE POLICY "Authenticated users can create QR connect events"
  ON public.profile_qr_connect_events FOR INSERT
  WITH CHECK (
    auth.uid() = requester_profile_id
    AND requester_profile_id <> target_profile_id
    AND EXISTS (
      SELECT 1
      FROM public.qr_codes q
      WHERE q.id = qr_code_id
      AND q.type = 'profile'
      AND q.is_active = true
      AND q.profile_id = target_profile_id
    )
  );

DROP POLICY IF EXISTS "Reward definitions are readable by everyone" ON public.reward_definitions;
CREATE POLICY "Reward definitions are readable by everyone"
  ON public.reward_definitions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can view their reward grants" ON public.reward_grants;
CREATE POLICY "Users can view their reward grants"
  ON public.reward_grants FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );
