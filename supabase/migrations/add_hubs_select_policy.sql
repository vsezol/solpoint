-- Migration: Add SELECT policies for hubs, hub_members, event_members, and other member tables
-- Description: Ensures that hubs, their members, event members, and other entity members are viewable by everyone (public read access)
-- This is required for the /api/members endpoint to work correctly

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Hubs are viewable by everyone" ON public.hubs;
DROP POLICY IF EXISTS "Hub members are viewable by authenticated users" ON public.hub_members;
DROP POLICY IF EXISTS "Hub members are viewable by everyone" ON public.hub_members;
DROP POLICY IF EXISTS "Event members are viewable by authenticated users" ON public.event_members;
DROP POLICY IF EXISTS "Event members are viewable by everyone" ON public.event_members;
DROP POLICY IF EXISTS "Community members are viewable by authenticated users" ON public.community_members;
DROP POLICY IF EXISTS "Community members are viewable by everyone" ON public.community_members;
DROP POLICY IF EXISTS "Project members are viewable by authenticated users" ON public.project_members;
DROP POLICY IF EXISTS "Project members are viewable by everyone" ON public.project_members;
DROP POLICY IF EXISTS "Workspace members are viewable by authenticated users" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace members are viewable by everyone" ON public.workspace_members;

-- Create the policy for hubs (public read access)
CREATE POLICY "Hubs are viewable by everyone"
  ON public.hubs FOR SELECT
  USING (true);

-- Create a new policy that allows everyone to view hub members (public read access)
CREATE POLICY "Hub members are viewable by everyone"
  ON public.hub_members FOR SELECT
  USING (true);

-- Create a new policy that allows everyone to view event members (public read access)
CREATE POLICY "Event members are viewable by everyone"
  ON public.event_members FOR SELECT
  USING (true);

-- Create policies for community members (public read access)
CREATE POLICY "Community members are viewable by everyone"
  ON public.community_members FOR SELECT
  USING (true);

-- Create policies for project members (public read access)
CREATE POLICY "Project members are viewable by everyone"
  ON public.project_members FOR SELECT
  USING (true);

-- Create policies for workspace members (public read access)
CREATE POLICY "Workspace members are viewable by everyone"
  ON public.workspace_members FOR SELECT
  USING (true);

