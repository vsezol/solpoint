-- Verification script: Check that invite system creates mutual friendships correctly
-- This script helps verify that the invite system is working properly
-- Run this after applying migrate_friends_to_follows.sql

-- Check 1: Verify that create_mutual_friendship function exists and works
SELECT 
  EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'create_mutual_friendship' 
    AND pronamespace = 'public'::regnamespace
  ) as function_exists;

-- Check 2: Test the function (replace with actual user IDs for testing)
-- SELECT public.create_mutual_friendship(
--   'user-id-1'::UUID,
--   'user-id-2'::UUID
-- );

-- Check 3: Verify that referrals create mutual friendships
-- This query shows referrals and checks if mutual friendship exists
SELECT 
  r.id as referral_id,
  r.inviter_user_id,
  r.invited_user_id,
  r.created_at as referral_created_at,
  -- Check if inviter follows invited
  EXISTS (
    SELECT 1 FROM public.follows 
    WHERE follower_id = r.inviter_user_id 
    AND following_id = r.invited_user_id
  ) as inviter_follows_invited,
  -- Check if invited follows inviter
  EXISTS (
    SELECT 1 FROM public.follows 
    WHERE follower_id = r.invited_user_id 
    AND following_id = r.inviter_user_id
  ) as invited_follows_inviter,
  -- Check if they are mutual friends
  EXISTS (
    SELECT 1 FROM public.mutual_friends 
    WHERE (user_id = r.inviter_user_id AND friend_id = r.invited_user_id)
    OR (user_id = r.invited_user_id AND friend_id = r.inviter_user_id)
  ) as are_mutual_friends
FROM public.referrals r
ORDER BY r.created_at DESC
LIMIT 10;

-- Check 4: Find referrals without mutual friendships (potential issues)
SELECT 
  r.id as referral_id,
  r.inviter_user_id,
  r.invited_user_id,
  r.created_at,
  'Missing mutual friendship' as issue
FROM public.referrals r
WHERE NOT EXISTS (
  SELECT 1 FROM public.mutual_friends 
  WHERE (user_id = r.inviter_user_id AND friend_id = r.invited_user_id)
  OR (user_id = r.invited_user_id AND friend_id = r.inviter_user_id)
)
ORDER BY r.created_at DESC;

-- Check 5: Statistics
SELECT 
  COUNT(*) as total_referrals,
  COUNT(DISTINCT inviter_user_id) as unique_inviters,
  COUNT(DISTINCT invited_user_id) as unique_invited_users,
  -- Count referrals with mutual friendships
  COUNT(*) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM public.mutual_friends 
      WHERE (user_id = referrals.inviter_user_id AND friend_id = referrals.invited_user_id)
      OR (user_id = referrals.invited_user_id AND friend_id = referrals.inviter_user_id)
    )
  ) as referrals_with_mutual_friendships,
  -- Count referrals without mutual friendships
  COUNT(*) FILTER (
    WHERE NOT EXISTS (
      SELECT 1 FROM public.mutual_friends 
      WHERE (user_id = referrals.inviter_user_id AND friend_id = referrals.invited_user_id)
      OR (user_id = referrals.invited_user_id AND friend_id = referrals.inviter_user_id)
    )
  ) as referrals_without_mutual_friendships
FROM public.referrals;



