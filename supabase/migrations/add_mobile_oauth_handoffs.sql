CREATE TABLE IF NOT EXISTS public.mobile_oauth_handoffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_hash TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_oauth_handoffs_code_hash
  ON public.mobile_oauth_handoffs(code_hash);

CREATE INDEX IF NOT EXISTS idx_mobile_oauth_handoffs_expires_at
  ON public.mobile_oauth_handoffs(expires_at);

ALTER TABLE public.mobile_oauth_handoffs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_mobile_oauth_handoff(p_code_hash TEXT)
RETURNS TABLE(access_token TEXT, refresh_token TEXT, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH consumed AS (
    UPDATE public.mobile_oauth_handoffs
    SET consumed_at = NOW()
    WHERE code_hash = p_code_hash
      AND consumed_at IS NULL
      AND expires_at > NOW()
    RETURNING
      mobile_oauth_handoffs.access_token,
      mobile_oauth_handoffs.refresh_token,
      mobile_oauth_handoffs.user_id
  )
  SELECT
    consumed.access_token,
    consumed.refresh_token,
    consumed.user_id
  FROM consumed;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_mobile_oauth_handoff(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_mobile_oauth_handoff(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.consume_mobile_oauth_handoff(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_mobile_oauth_handoff(TEXT) TO service_role;

REVOKE ALL ON TABLE public.mobile_oauth_handoffs FROM anon;
REVOKE ALL ON TABLE public.mobile_oauth_handoffs FROM authenticated;
GRANT ALL ON TABLE public.mobile_oauth_handoffs TO service_role;
