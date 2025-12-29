-- Migration: Migrate from friends system to follows system (Instagram/Twitter model)
-- This migration converts the friend request system to a follow/unfollow system
-- Date: 2024

-- Step 1: Create follows table (one-way subscriptions)
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON public.follows(created_at DESC);

-- Step 3: Create view for mutual friends (bidirectional follows)
CREATE OR REPLACE VIEW public.mutual_friends AS
SELECT 
  f1.follower_id as user_id,
  f1.following_id as friend_id,
  GREATEST(f1.created_at, f2.created_at) as friendship_started_at
FROM public.follows f1
INNER JOIN public.follows f2 
  ON f1.follower_id = f2.following_id 
  AND f1.following_id = f2.follower_id
WHERE f1.follower_id < f1.following_id; -- Avoid duplicates

-- Step 4: Migrate existing accepted friendships to follows
-- For each accepted friendship, create bidirectional follows
INSERT INTO public.follows (follower_id, following_id, created_at)
SELECT 
  user_id as follower_id,
  friend_id as following_id,
  created_at
FROM public.friends
WHERE status = 'accepted'
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Also create reverse direction for mutual follows
INSERT INTO public.follows (follower_id, following_id, created_at)
SELECT 
  friend_id as follower_id,
  user_id as following_id,
  created_at
FROM public.friends
WHERE status = 'accepted'
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Step 5: Migrate pending friend requests as one-way follows
-- If user A sent request to user B (pending), A follows B
INSERT INTO public.follows (follower_id, following_id, created_at)
SELECT 
  user_id as follower_id,
  friend_id as following_id,
  created_at
FROM public.friends
WHERE status = 'pending'
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Step 6: Enable Row Level Security
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for follows
-- Users can view all follows (public information)
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
CREATE POLICY "Anyone can view follows"
  ON public.follows FOR SELECT
  USING (true);

-- Users can create their own follows
DROP POLICY IF EXISTS "Users can create their own follows" ON public.follows;
CREATE POLICY "Users can create their own follows"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can delete their own follows (unfollow)
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;
CREATE POLICY "Users can delete their own follows"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Step 8: Create helper functions for common queries

-- Function to check if user A follows user B
CREATE OR REPLACE FUNCTION public.is_following(
  p_follower_id UUID,
  p_following_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = p_follower_id
    AND following_id = p_following_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if two users are mutual friends
CREATE OR REPLACE FUNCTION public.are_mutual_friends(
  p_user_id UUID,
  p_friend_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.mutual_friends
    WHERE (user_id = p_user_id AND friend_id = p_friend_id)
    OR (user_id = p_friend_id AND friend_id = p_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get follow status between two users
-- Returns: 'none', 'following', 'follower', 'mutual'
CREATE OR REPLACE FUNCTION public.get_follow_status(
  p_user_id UUID,
  p_other_user_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_user_follows_other BOOLEAN;
  v_other_follows_user BOOLEAN;
BEGIN
  -- Check if user follows other
  SELECT EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = p_user_id AND following_id = p_other_user_id
  ) INTO v_user_follows_other;
  
  -- Check if other follows user
  SELECT EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = p_other_user_id AND following_id = p_user_id
  ) INTO v_other_follows_user;
  
  -- Determine status
  IF v_user_follows_other AND v_other_follows_user THEN
    RETURN 'mutual';
  ELSIF v_user_follows_other THEN
    RETURN 'following';
  ELSIF v_other_follows_user THEN
    RETURN 'follower';
  ELSE
    RETURN 'none';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create function to get followers count
CREATE OR REPLACE FUNCTION public.get_followers_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.follows
    WHERE following_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create function to get following count
CREATE OR REPLACE FUNCTION public.get_following_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.follows
    WHERE follower_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Create function to get mutual friends count
CREATE OR REPLACE FUNCTION public.get_mutual_friends_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.mutual_friends
    WHERE user_id = p_user_id OR friend_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Add comments for documentation
COMMENT ON TABLE public.follows IS 'One-way follow relationships (Instagram/Twitter model)';
COMMENT ON VIEW public.mutual_friends IS 'Mutual follows (bidirectional) - these are considered friends';
COMMENT ON FUNCTION public.is_following IS 'Check if user A follows user B';
COMMENT ON FUNCTION public.are_mutual_friends IS 'Check if two users are mutual friends';
COMMENT ON FUNCTION public.get_follow_status IS 'Get follow status: none, following, follower, or mutual';
COMMENT ON FUNCTION public.get_followers_count IS 'Get count of users following the given user';
COMMENT ON FUNCTION public.get_following_count IS 'Get count of users the given user is following';
COMMENT ON FUNCTION public.get_mutual_friends_count IS 'Get count of mutual friends for the given user';




