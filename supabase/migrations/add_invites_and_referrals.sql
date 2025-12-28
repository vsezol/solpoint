-- Migration: Add invites and referrals tables
-- This migration creates the invite system for user referrals
-- Date: 2024

-- Invites table
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  inviter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_uses INTEGER, -- NULL means unlimited
  expires_at TIMESTAMPTZ, -- NULL means no expiration
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_id UUID NOT NULL REFERENCES public.invites(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invite_id, invited_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invites_code ON public.invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_inviter_user_id ON public.invites(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_invite_id ON public.referrals(invite_id);
CREATE INDEX IF NOT EXISTS idx_referrals_inviter_user_id ON public.referrals(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_invited_user_id ON public.referrals(invited_user_id);

-- Row Level Security (RLS)
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Invites policies
-- Users can view their own invites
DROP POLICY IF EXISTS "Users can view their own invites" ON public.invites;
CREATE POLICY "Users can view their own invites"
  ON public.invites FOR SELECT
  USING (auth.uid() = inviter_user_id);

-- Allow authenticated users to read invites (needed for registration flow - backend needs to find invite by code)
DROP POLICY IF EXISTS "Authenticated users can read invites" ON public.invites;
CREATE POLICY "Authenticated users can read invites"
  ON public.invites FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can create their own invites" ON public.invites;
CREATE POLICY "Users can create their own invites"
  ON public.invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_user_id);

DROP POLICY IF EXISTS "Users can update their own invites" ON public.invites;
CREATE POLICY "Users can update their own invites"
  ON public.invites FOR UPDATE
  USING (auth.uid() = inviter_user_id);

-- Referrals policies
DROP POLICY IF EXISTS "Users can view referrals where they are inviter or invited" ON public.referrals;
CREATE POLICY "Users can view referrals where they are inviter or invited"
  ON public.referrals FOR SELECT
  USING (auth.uid() = inviter_user_id OR auth.uid() = invited_user_id);

DROP POLICY IF EXISTS "System can create referrals" ON public.referrals;
CREATE POLICY "System can create referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (true); -- This will be handled by server-side logic

-- Function to generate unique invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  
  -- Check if code already exists, regenerate if needed
  WHILE EXISTS (SELECT 1 FROM public.invites WHERE code = result) LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get invite by code (bypasses RLS for server-side operations)
CREATE OR REPLACE FUNCTION public.get_invite_by_code(invite_code TEXT)
RETURNS TABLE (
  id UUID,
  code TEXT,
  inviter_user_id UUID,
  max_uses INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.code,
    i.inviter_user_id,
    i.max_uses,
    i.expires_at,
    i.created_at
  FROM public.invites i
  WHERE i.code = invite_code
  LIMIT 1;
END;
$$;

-- Function to create mutual friendship (creates bidirectional follows)
-- Updated to use follows table instead of friends table
CREATE OR REPLACE FUNCTION public.create_mutual_friendship(
  p_user_id_1 UUID,
  p_user_id_2 UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Создаем взаимные подписки (follows) в обоих направлениях
  -- Игнорируем дубликаты (ON CONFLICT DO NOTHING)
  INSERT INTO public.follows (follower_id, following_id)
  VALUES (p_user_id_1, p_user_id_2)
  ON CONFLICT (follower_id, following_id) DO NOTHING;
  
  INSERT INTO public.follows (follower_id, following_id)
  VALUES (p_user_id_2, p_user_id_1)
  ON CONFLICT (follower_id, following_id) DO NOTHING;
END;
$$;

