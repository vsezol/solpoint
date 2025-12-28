-- Migration: Clean blob URLs from image_url fields
-- This removes blob URLs that were accidentally saved to the database
-- Blob URLs are temporary and don't work after page reload

-- Clean events table
UPDATE public.events
SET image_url = NULL
WHERE image_url LIKE 'blob:%';

-- Clean hubs table
UPDATE public.hubs
SET image_url = NULL
WHERE image_url LIKE 'blob:%';

-- Clean communities table
UPDATE public.communities
SET image_url = NULL
WHERE image_url LIKE 'blob:%';

-- Clean projects table
UPDATE public.projects
SET image_url = NULL
WHERE image_url LIKE 'blob:%';

-- Clean workspaces table (if exists)
UPDATE public.workspaces
SET image_url = NULL
WHERE image_url LIKE 'blob:%';

