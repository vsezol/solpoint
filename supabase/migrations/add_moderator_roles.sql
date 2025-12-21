-- Add moderator roles system for all entities
-- This migration adds role field to hub_members, community_members, project_members
-- and creates event_roles table for events

-- Create member_role enum
CREATE TYPE member_role AS ENUM ('member', 'moderator', 'owner');

-- Add role column to hub_members
ALTER TABLE public.hub_members
ADD COLUMN role member_role DEFAULT 'member' NOT NULL;

-- Add role column to community_members
ALTER TABLE public.community_members
ADD COLUMN role member_role DEFAULT 'member' NOT NULL;

-- Add role column to project_members
ALTER TABLE public.project_members
ADD COLUMN role member_role DEFAULT 'member' NOT NULL;

-- Create event_roles table for events (separate from attendees)
CREATE TABLE public.event_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'moderator',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create indexes for event_roles
CREATE INDEX idx_event_roles_event_id ON public.event_roles(event_id);
CREATE INDEX idx_event_roles_user_id ON public.event_roles(user_id);
CREATE INDEX idx_event_roles_role ON public.event_roles(role);

-- Create indexes for role columns in member tables
CREATE INDEX idx_hub_members_role ON public.hub_members(role);
CREATE INDEX idx_community_members_role ON public.community_members(role);
CREATE INDEX idx_project_members_role ON public.project_members(role);

-- Set existing creators as 'owner' role
-- For hubs
UPDATE public.hub_members hm
SET role = 'owner'
WHERE EXISTS (
  SELECT 1 FROM public.hubs h
  WHERE h.id = hm.hub_id
  AND h.creator_id = hm.user_id
);

-- For communities
UPDATE public.community_members cm
SET role = 'owner'
WHERE EXISTS (
  SELECT 1 FROM public.communities c
  WHERE c.id = cm.community_id
  AND c.creator_id = cm.user_id
);

-- For projects
UPDATE public.project_members pm
SET role = 'owner'
WHERE EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = pm.project_id
  AND p.creator_id = pm.user_id
);

-- Insert owners into event_roles for existing events
INSERT INTO public.event_roles (event_id, user_id, role)
SELECT id, organizer_id, 'owner'
FROM public.events
WHERE organizer_id IS NOT NULL
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Enable RLS for event_roles
ALTER TABLE public.event_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_roles
CREATE POLICY "Event roles are viewable by authenticated users"
  ON public.event_roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Event organizers can manage event roles"
  ON public.event_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id
      AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Event organizers can update event roles"
  ON public.event_roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id
      AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Event organizers can delete event roles"
  ON public.event_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id
      AND organizer_id = auth.uid()
    )
  );

-- Update RLS policies for member tables to allow owners and moderators to manage roles
-- Note: We'll update the existing policies, but first we need to drop and recreate them
-- For now, we'll add new policies that check for owner/moderator permissions

-- Drop existing update policies for member tables (they'll be recreated with role checks)
DROP POLICY IF EXISTS "Creators can update their hubs" ON public.hubs;
DROP POLICY IF EXISTS "Creators can update their communities" ON public.communities;
DROP POLICY IF EXISTS "Creators can update their projects" ON public.projects;

-- Recreate policies with moderator support
CREATE POLICY "Creators and moderators can update hubs"
  ON public.hubs FOR UPDATE
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.hub_members
      WHERE hub_id = id
      AND user_id = auth.uid()
      AND role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Creators and moderators can update communities"
  ON public.communities FOR UPDATE
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_id = id
      AND user_id = auth.uid()
      AND role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Creators and moderators can update projects"
  ON public.projects FOR UPDATE
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = id
      AND user_id = auth.uid()
      AND role IN ('owner', 'moderator')
    )
  );

-- Add policies for updating member roles (only owners can do this)
-- Hub members role update
CREATE POLICY "Hub owners can update member roles"
  ON public.hub_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.hub_members hm
      JOIN public.hubs h ON h.id = hm.hub_id
      WHERE hm.hub_id = hub_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
    )
  );

-- Community members role update
CREATE POLICY "Community owners can update member roles"
  ON public.community_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      JOIN public.communities c ON c.id = cm.community_id
      WHERE cm.community_id = community_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'owner'
    )
  );

-- Project members role update
CREATE POLICY "Project owners can update member roles"
  ON public.project_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.projects p ON p.id = pm.project_id
      WHERE pm.project_id = project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- Drop old DELETE policies that only allowed creators
DROP POLICY IF EXISTS "Users can leave hubs" ON public.hub_members;
DROP POLICY IF EXISTS "Users can leave communities" ON public.community_members;
DROP POLICY IF EXISTS "Users can leave projects" ON public.project_members;

-- Add new policies for owners and moderators to remove members (but not owners)
-- Users can still leave themselves
CREATE POLICY "Users can leave hubs"
  ON public.hub_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Hub owners and moderators can remove members"
  ON public.hub_members FOR DELETE
  USING (
    auth.uid() != user_id  -- Cannot remove yourself via this policy
    AND EXISTS (
      SELECT 1 FROM public.hub_members hm
      WHERE hm.hub_id = hub_members.hub_id
      AND hm.user_id = auth.uid()
      AND hm.role IN ('owner', 'moderator')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.hub_members hm2
      WHERE hm2.hub_id = hub_members.hub_id
      AND hm2.user_id = hub_members.user_id
      AND hm2.role = 'owner'
    )
  );

CREATE POLICY "Users can leave communities"
  ON public.community_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Community owners and moderators can remove members"
  ON public.community_members FOR DELETE
  USING (
    auth.uid() != user_id  -- Cannot remove yourself via this policy
    AND EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'moderator')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.community_members cm2
      WHERE cm2.community_id = community_members.community_id
      AND cm2.user_id = community_members.user_id
      AND cm2.role = 'owner'
    )
  );

CREATE POLICY "Users can leave projects"
  ON public.project_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Project owners and moderators can remove members"
  ON public.project_members FOR DELETE
  USING (
    auth.uid() != user_id  -- Cannot remove yourself via this policy
    AND EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'moderator')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.project_members pm2
      WHERE pm2.project_id = project_members.project_id
      AND pm2.user_id = project_members.user_id
      AND pm2.role = 'owner'
    )
  );

