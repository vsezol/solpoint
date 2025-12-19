-- Add admin field to profiles table
-- This migration adds is_admin boolean field to allow admin access control

-- Add is_admin column to profiles table (defaults to false)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_admin IS 'Flag to indicate if user has admin privileges';

