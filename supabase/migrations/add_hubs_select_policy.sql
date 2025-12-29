-- Migration: Add SELECT policies for hubs and hub_members tables
-- Description: Ensures that hubs and their members are viewable by everyone (public read access)
-- This is required for the /api/members endpoint to work correctly

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Hubs are viewable by everyone" ON public.hubs;
DROP POLICY IF EXISTS "Hub members are viewable by authenticated users" ON public.hub_members;
DROP POLICY IF EXISTS "Hub members are viewable by everyone" ON public.hub_members;

-- Create the policy for hubs (public read access)
CREATE POLICY "Hubs are viewable by everyone"
  ON public.hubs FOR SELECT
  USING (true);

-- Create a new policy that allows everyone to view hub members (public read access)
CREATE POLICY "Hub members are viewable by everyone"
  ON public.hub_members FOR SELECT
  USING (true);

