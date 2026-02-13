-- Luma workflow cron config: one table, workflow_type enum, nullable params per type

DO $$ BEGIN
  CREATE TYPE public.luma_workflow_type AS ENUM (
    'full_pipeline',
    'attendees_only'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.luma_workflow_type IS 'full_pipeline = scrape events → transfer → enrich → save images; attendees_only = update attendees for existing events';

CREATE TABLE IF NOT EXISTS public.luma_workflow_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_type public.luma_workflow_type NOT NULL,

  -- Schedule
  schedule_type TEXT NOT NULL DEFAULT 'daily',  -- 'daily' | 'cron'
  run_at_hour_utc SMALLINT CHECK (run_at_hour_utc IS NULL OR (run_at_hour_utc >= 0 AND run_at_hour_utc <= 23)),
  run_at_minute SMALLINT CHECK (run_at_minute IS NULL OR (run_at_minute >= 0 AND run_at_minute <= 59)),
  cron_expression TEXT,

  -- Scrape params (for full_pipeline; NULL for attendees_only)
  parse_guests BOOLEAN,
  max_events INTEGER,
  calendar_slug TEXT,

  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_luma_workflow_config_one_enabled_per_type
  ON public.luma_workflow_config (workflow_type)
  WHERE enabled = true;

COMMENT ON TABLE public.luma_workflow_config IS 'Cron config per workflow type. One enabled config per workflow_type.';
COMMENT ON COLUMN public.luma_workflow_config.run_at_hour_utc IS 'For schedule_type=daily: run at this hour UTC (0-23).';
COMMENT ON COLUMN public.luma_workflow_config.run_at_minute IS 'For schedule_type=daily: run at this minute (0-59).';
COMMENT ON COLUMN public.luma_workflow_config.cron_expression IS 'For schedule_type=cron: e.g. 0 3 * * * (daily 03:00 UTC).';
COMMENT ON COLUMN public.luma_workflow_config.parse_guests IS 'Full pipeline only: whether to parse guests.';
COMMENT ON COLUMN public.luma_workflow_config.max_events IS 'Full pipeline: max events per run. NULL = use default.';

ALTER TABLE public.luma_workflow_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage luma_workflow_config"
  ON public.luma_workflow_config FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Anyone can read luma_workflow_config (for cron)"
  ON public.luma_workflow_config FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.set_luma_workflow_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS luma_workflow_config_updated_at ON public.luma_workflow_config;
CREATE TRIGGER luma_workflow_config_updated_at
  BEFORE UPDATE ON public.luma_workflow_config
  FOR EACH ROW EXECUTE FUNCTION public.set_luma_workflow_config_updated_at();
