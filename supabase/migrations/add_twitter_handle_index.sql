-- Migration: Add index for twitter_handle
-- This index is needed for efficient profile lookups by username
-- Date: 2024

-- Check if index doesn't exist before creating
CREATE INDEX IF NOT EXISTS idx_profiles_twitter_handle ON public.profiles(twitter_handle);

