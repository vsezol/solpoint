-- Flag to hide event from admin "Required verification" list after human review
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS required_verification_dismissed BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.events.required_verification_dismissed IS 'When true, event is excluded from admin "Required verification" list even if name/date/description/image/country/city/address/organizers are missing. Set via admin dismiss.';
