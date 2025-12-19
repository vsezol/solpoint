-- Migration: Add country_code column to hubs, communities and projects tables
-- Description: Adds country_code field to hubs, communities and projects for ISO 3166-1 alpha-2 country codes
-- Date: 2024

-- Add country_code column to hubs
ALTER TABLE public.hubs
  ADD COLUMN IF NOT EXISTS country_code CHAR(2);

-- Add constraint to ensure country_code is uppercase for hubs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_hubs_country_code_uppercase'
  ) THEN
    ALTER TABLE public.hubs
      ADD CONSTRAINT check_hubs_country_code_uppercase 
      CHECK (country_code IS NULL OR country_code = UPPER(country_code));
  END IF;
END $$;

-- Add constraint to ensure country_code is 2 characters for hubs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_hubs_country_code_length'
  ) THEN
    ALTER TABLE public.hubs
      ADD CONSTRAINT check_hubs_country_code_length 
      CHECK (country_code IS NULL OR LENGTH(country_code) = 2);
  END IF;
END $$;

-- Add foreign key to countries table for hubs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_hubs_country_code'
  ) THEN
    ALTER TABLE public.hubs
      ADD CONSTRAINT fk_hubs_country_code 
      FOREIGN KEY (country_code) REFERENCES public.countries(code)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for country_code in hubs
CREATE INDEX IF NOT EXISTS idx_hubs_country_code ON public.hubs(country_code);

-- Add comment for hubs
COMMENT ON COLUMN public.hubs.country_code IS 'ISO 3166-1 alpha-2 country code (nullable, uppercase, 2 chars)';

-- Add country_code column to communities
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS country_code CHAR(2);

-- Add constraint to ensure country_code is uppercase for communities
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_communities_country_code_uppercase'
  ) THEN
    ALTER TABLE public.communities
      ADD CONSTRAINT check_communities_country_code_uppercase 
      CHECK (country_code IS NULL OR country_code = UPPER(country_code));
  END IF;
END $$;

-- Add constraint to ensure country_code is 2 characters for communities
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_communities_country_code_length'
  ) THEN
    ALTER TABLE public.communities
      ADD CONSTRAINT check_communities_country_code_length 
      CHECK (country_code IS NULL OR LENGTH(country_code) = 2);
  END IF;
END $$;

-- Add foreign key to countries table for communities
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_communities_country_code'
  ) THEN
    ALTER TABLE public.communities
      ADD CONSTRAINT fk_communities_country_code 
      FOREIGN KEY (country_code) REFERENCES public.countries(code)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for country_code in communities
CREATE INDEX IF NOT EXISTS idx_communities_country_code ON public.communities(country_code);

-- Add comment for communities
COMMENT ON COLUMN public.communities.country_code IS 'ISO 3166-1 alpha-2 country code (nullable, uppercase, 2 chars)';

-- Add country_code column to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS country_code CHAR(2);

-- Add constraint to ensure country_code is uppercase for projects
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_projects_country_code_uppercase'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT check_projects_country_code_uppercase 
      CHECK (country_code IS NULL OR country_code = UPPER(country_code));
  END IF;
END $$;

-- Add constraint to ensure country_code is 2 characters for projects
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_projects_country_code_length'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT check_projects_country_code_length 
      CHECK (country_code IS NULL OR LENGTH(country_code) = 2);
  END IF;
END $$;

-- Add foreign key to countries table for projects
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_projects_country_code'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT fk_projects_country_code 
      FOREIGN KEY (country_code) REFERENCES public.countries(code)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for country_code in projects
CREATE INDEX IF NOT EXISTS idx_projects_country_code ON public.projects(country_code);

-- Add comment for projects
COMMENT ON COLUMN public.projects.country_code IS 'ISO 3166-1 alpha-2 country code (nullable, uppercase, 2 chars)';

