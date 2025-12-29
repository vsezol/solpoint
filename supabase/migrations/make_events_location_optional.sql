-- Migration: Make location fields optional for events
-- Description: Allows events to be created without location (global events)
-- Date: 2024

-- Make location fields optional for events
ALTER TABLE public.events
  ALTER COLUMN country DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN latitude DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;

-- Add comment explaining the optional nature
COMMENT ON COLUMN public.events.country IS 'Country for map placement. NULL for global events.';
COMMENT ON COLUMN public.events.city IS 'City for map placement. NULL for global events or country-only events.';
COMMENT ON COLUMN public.events.latitude IS 'Coordinates for map placement. NULL for global events.';
COMMENT ON COLUMN public.events.longitude IS 'Coordinates for map placement. NULL for global events.';



