-- Migration: Drop deprecated friends table
-- This migration removes the old friends table after migration to follows system
-- Date: 2024
-- 
-- WARNING: Only run this after:
-- 1. migrate_friends_to_follows.sql has been executed successfully
-- 2. All data has been migrated to follows table
-- 3. You have verified that the new system works correctly
-- 4. You have a backup of your database

-- Step 1: Drop RLS policies on friends table
-- Note: create_mutual_friendship function has already been updated to use follows table
DROP POLICY IF EXISTS "Users can view their friends" ON public.friends;
DROP POLICY IF EXISTS "Authenticated users can add friends" ON public.friends;
DROP POLICY IF EXISTS "Users can update their friend requests" ON public.friends;

-- Step 3: Disable RLS on friends table
ALTER TABLE IF EXISTS public.friends DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop the friends table
-- CASCADE will automatically drop any dependent objects (indexes, constraints, etc.)
DROP TABLE IF EXISTS public.friends CASCADE;

-- Step 5: Verify that follows table exists (safety check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'follows'
  ) THEN
    RAISE EXCEPTION 'follows table does not exist! Cannot drop friends table.';
  END IF;
END $$;

-- Step 6: Verify that mutual_friends view exists (safety check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'mutual_friends'
  ) THEN
    RAISE EXCEPTION 'mutual_friends view does not exist! Cannot drop friends table.';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully dropped friends table. Migration to follows system is complete.';
END $$;

