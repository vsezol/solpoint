-- Migration: internal-only attendees_count cache for events
-- Source of truth: public.event_members with status = 'going'

CREATE OR REPLACE FUNCTION public.recompute_event_attendance_cache(target_event_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  going_count INTEGER := 0;
BEGIN
  IF target_event_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO going_count
  FROM public.event_members
  WHERE event_id = target_event_id
    AND status = 'going';

  UPDATE public.events
  SET attendees_count = COALESCE(going_count, 0),
      capacity_remaining = CASE
        WHEN max_attendees IS NULL THEN NULL
        ELSE GREATEST(0, max_attendees - COALESCE(going_count, 0))
      END
  WHERE id = target_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_event_attendance_cache_on_member_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_event_attendance_cache(NEW.event_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_event_attendance_cache(OLD.event_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.event_id IS DISTINCT FROM NEW.event_id THEN
      PERFORM public.recompute_event_attendance_cache(OLD.event_id);
      PERFORM public.recompute_event_attendance_cache(NEW.event_id);
    ELSE
      PERFORM public.recompute_event_attendance_cache(NEW.event_id);
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS event_members_count_trigger ON public.event_members;
DROP TRIGGER IF EXISTS event_members_attendance_cache_trigger ON public.event_members;

CREATE TRIGGER event_members_attendance_cache_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.event_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_event_attendance_cache_on_member_change();

-- One-time backfill for all existing events.
WITH going_counts AS (
  SELECT
    e.id AS event_id,
    COALESCE(m.going_count, 0) AS going_count
  FROM public.events e
  LEFT JOIN (
    SELECT event_id, COUNT(*)::INTEGER AS going_count
    FROM public.event_members
    WHERE status = 'going'
    GROUP BY event_id
  ) m
    ON m.event_id = e.id
)
UPDATE public.events e
SET attendees_count = g.going_count,
    capacity_remaining = CASE
      WHEN e.max_attendees IS NULL THEN NULL
      ELSE GREATEST(0, e.max_attendees - g.going_count)
    END
FROM going_counts g
WHERE e.id = g.event_id;

