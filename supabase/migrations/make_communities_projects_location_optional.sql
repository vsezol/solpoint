-- Migration: Make location fields optional for hubs, communities and projects
-- Description: Allows hubs, communities and projects to be created without location (global entities)
-- Date: 2024

-- Make location fields optional for hubs
ALTER TABLE public.hubs
  ALTER COLUMN country DROP NOT NULL,
  ALTER COLUMN latitude DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;

-- Make location fields optional for communities
ALTER TABLE public.communities
  ALTER COLUMN country DROP NOT NULL,
  ALTER COLUMN latitude DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;

-- Make location fields optional for projects
ALTER TABLE public.projects
  ALTER COLUMN country DROP NOT NULL,
  ALTER COLUMN latitude DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;

-- Add comment explaining the optional nature
COMMENT ON COLUMN public.hubs.country IS 'Country for map placement. NULL for global hubs.';
COMMENT ON COLUMN public.hubs.latitude IS 'Coordinates for map placement. NULL for global hubs.';
COMMENT ON COLUMN public.hubs.longitude IS 'Coordinates for map placement. NULL for global hubs.';

COMMENT ON COLUMN public.communities.country IS 'Country for map placement. NULL for global communities.';
COMMENT ON COLUMN public.communities.latitude IS 'Coordinates for map placement. NULL for global communities.';
COMMENT ON COLUMN public.communities.longitude IS 'Coordinates for map placement. NULL for global communities.';

COMMENT ON COLUMN public.projects.country IS 'Country for map placement. NULL for global projects.';
COMMENT ON COLUMN public.projects.latitude IS 'Coordinates for map placement. NULL for global projects.';
COMMENT ON COLUMN public.projects.longitude IS 'Coordinates for map placement. NULL for global projects.';

