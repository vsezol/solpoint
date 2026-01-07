-- Migration: Add function to verify and optionally sync members_count
-- This function can be called periodically or manually to ensure data consistency
-- It's useful for monitoring and can be run as a safety check

-- Function to verify counts (read-only, for monitoring)
CREATE OR REPLACE FUNCTION verify_members_counts()
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  stored_count INTEGER,
  actual_count BIGINT,
  discrepancy INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Hubs
  SELECT 
    'hub'::TEXT,
    h.id,
    h.members_count,
    COALESCE((SELECT COUNT(*) FROM public.hub_members WHERE hub_id = h.id), 0)::BIGINT,
    (h.members_count - COALESCE((SELECT COUNT(*) FROM public.hub_members WHERE hub_id = h.id), 0))::INTEGER
  FROM public.hubs h
  WHERE h.members_count != COALESCE((SELECT COUNT(*) FROM public.hub_members WHERE hub_id = h.id), 0)
  
  UNION ALL
  
  -- Communities
  SELECT 
    'community'::TEXT,
    c.id,
    c.members_count,
    COALESCE((SELECT COUNT(*) FROM public.community_members WHERE community_id = c.id), 0)::BIGINT,
    (c.members_count - COALESCE((SELECT COUNT(*) FROM public.community_members WHERE community_id = c.id), 0))::INTEGER
  FROM public.communities c
  WHERE c.members_count != COALESCE((SELECT COUNT(*) FROM public.community_members WHERE community_id = c.id), 0)
  
  UNION ALL
  
  -- Projects
  SELECT 
    'project'::TEXT,
    p.id,
    p.members_count,
    COALESCE((SELECT COUNT(*) FROM public.project_members WHERE project_id = p.id), 0)::BIGINT,
    (p.members_count - COALESCE((SELECT COUNT(*) FROM public.project_members WHERE project_id = p.id), 0))::INTEGER
  FROM public.projects p
  WHERE p.members_count != COALESCE((SELECT COUNT(*) FROM public.project_members WHERE project_id = p.id), 0)
  
  UNION ALL
  
  -- Workspaces
  SELECT 
    'workspace'::TEXT,
    w.id,
    w.members_count,
    COALESCE((SELECT COUNT(*) FROM public.workspace_members WHERE workspace_id = w.id), 0)::BIGINT,
    (w.members_count - COALESCE((SELECT COUNT(*) FROM public.workspace_members WHERE workspace_id = w.id), 0))::INTEGER
  FROM public.workspaces w
  WHERE w.members_count != COALESCE((SELECT COUNT(*) FROM public.workspace_members WHERE workspace_id = w.id), 0)
  
  UNION ALL
  
  -- Events
  SELECT 
    'event'::TEXT,
    e.id,
    e.attendees_count,
    COALESCE((SELECT COUNT(*) FROM public.event_members WHERE event_id = e.id), 0)::BIGINT,
    (e.attendees_count - COALESCE((SELECT COUNT(*) FROM public.event_members WHERE event_id = e.id), 0))::INTEGER
  FROM public.events e
  WHERE e.attendees_count != COALESCE((SELECT COUNT(*) FROM public.event_members WHERE event_id = e.id), 0);
END;
$$;

-- Function to sync counts (can be called manually if needed)
CREATE OR REPLACE FUNCTION sync_all_members_counts()
RETURNS TABLE (
  entity_type TEXT,
  entities_synced INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hubs_synced INTEGER := 0;
  communities_synced INTEGER := 0;
  projects_synced INTEGER := 0;
  workspaces_synced INTEGER := 0;
  events_synced INTEGER := 0;
BEGIN
  -- Sync hubs
  WITH updated AS (
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
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO hubs_synced FROM updated;
  
  -- Sync communities
  WITH updated AS (
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
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO communities_synced FROM updated;
  
  -- Sync projects
  WITH updated AS (
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
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO projects_synced FROM updated;
  
  -- Sync workspaces
  WITH updated AS (
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
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO workspaces_synced FROM updated;
  
  -- Sync events
  WITH updated AS (
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
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO events_synced FROM updated;
  
  -- Return results
  RETURN QUERY SELECT 'hub'::TEXT, hubs_synced;
  RETURN QUERY SELECT 'community'::TEXT, communities_synced;
  RETURN QUERY SELECT 'project'::TEXT, projects_synced;
  RETURN QUERY SELECT 'workspace'::TEXT, workspaces_synced;
  RETURN QUERY SELECT 'event'::TEXT, events_synced;
END;
$$;

-- Grant execute permissions to authenticated users (optional, can be restricted to admins)
-- COMMENT ON FUNCTION verify_members_counts() IS 'Verify members_count discrepancies (read-only)';
-- COMMENT ON FUNCTION sync_all_members_counts() IS 'Sync all members_count values with actual counts (admin only)';

