-- Migration: Add Twitter sync fields
-- Adds last_twitter_sync_at to profiles and creates twitter_connections table
-- Date: 2024

-- Add last_twitter_sync_at field to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_twitter_sync_at TIMESTAMPTZ;

-- Create twitter_connections table for storing mutual Twitter followers
CREATE TABLE IF NOT EXISTS public.twitter_connections (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  twitter_friend_id TEXT NOT NULL,
  twitter_friend_username TEXT NOT NULL,
  twitter_friend_avatar_url TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, twitter_friend_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_twitter_connections_user_id ON public.twitter_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_twitter_connections_friend_id ON public.twitter_connections(twitter_friend_id);
CREATE INDEX IF NOT EXISTS idx_twitter_connections_synced_at ON public.twitter_connections(synced_at);

-- Add comment for documentation
COMMENT ON TABLE public.twitter_connections IS 'Stores mutual Twitter followers for each user. Synced once per 24 hours.';
COMMENT ON COLUMN public.profiles.last_twitter_sync_at IS 'Timestamp of last Twitter followers sync';

