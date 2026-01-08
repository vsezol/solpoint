-- Migration: Sync members_count with actual member counts
-- This fixes discrepancies caused by hardcoded initial values in seed data
-- 
-- The triggers (hub_members_count_trigger, etc.) will maintain correct counts
-- going forward, but we need to fix the initial incorrect values first.

-- Sync hub members_count
UPDATE public.hubs 
SET members_count = (
  SELECT COUNT(*) 
  FROM public.hub_members 
  WHERE hub_members.hub_id = hubs.id
)
WHERE members_count != (
  SELECT COUNT(*) 
  FROM public.hub_members 
  WHERE hub_members.hub_id = hubs.id
);

-- Sync community members_count
UPDATE public.communities 
SET members_count = (
  SELECT COUNT(*) 
  FROM public.community_members 
  WHERE community_members.community_id = communities.id
)
WHERE members_count != (
  SELECT COUNT(*) 
  FROM public.community_members 
  WHERE community_members.community_id = communities.id
);

-- Sync project members_count
UPDATE public.projects 
SET members_count = (
  SELECT COUNT(*) 
  FROM public.project_members 
  WHERE project_members.project_id = projects.id
)
WHERE members_count != (
  SELECT COUNT(*) 
  FROM public.project_members 
  WHERE project_members.project_id = projects.id
);

-- Sync workspace members_count
UPDATE public.workspaces 
SET members_count = (
  SELECT COUNT(*) 
  FROM public.workspace_members 
  WHERE workspace_members.workspace_id = workspaces.id
)
WHERE members_count != (
  SELECT COUNT(*) 
  FROM public.workspace_members 
  WHERE workspace_members.workspace_id = workspaces.id
);

-- Sync event attendees_count
UPDATE public.events 
SET attendees_count = (
  SELECT COUNT(*) 
  FROM public.event_members 
  WHERE event_members.event_id = events.id
)
WHERE attendees_count != (
  SELECT COUNT(*) 
  FROM public.event_members 
  WHERE event_members.event_id = events.id
);

-- Note: This migration will sync all members_count values with actual counts.
-- Use verify_members_counts() function from add_members_count_sync_function.sql
-- to check if there are any remaining discrepancies after running this migration.

