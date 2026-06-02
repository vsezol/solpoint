-- Remove specific profiles from database and map-related entities
-- Requested profiles:
-- - Mit Spegatti
-- - Sonya Deykun

DO $$
DECLARE
  target_ids uuid[];
BEGIN
  SELECT array_agg(id)
  INTO target_ids
  FROM public.profiles
  WHERE lower(trim(coalesce(twitter_name, ''))) IN ('mit spegatti', 'sonya deykun')
     OR lower(trim(coalesce(twitter_handle, ''))) IN (
       'mit_spegatti',
       'sonya_deykun',
       'mitspegatti',
       'sonyadeykun'
     );

  IF target_ids IS NULL OR array_length(target_ids, 1) IS NULL THEN
    RAISE NOTICE 'No matching profiles found for removal.';
    RETURN;
  END IF;

  -- Remove entities owned by these users so no orphaned owner_id rows remain.
  IF to_regclass('public.events') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'events'
        AND column_name = 'owner_id'
    ) THEN
      DELETE FROM public.events
      WHERE owner_id = ANY(target_ids)
        AND (
          owner_type IS NULL
          OR owner_type = 'user'
        );
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'events'
        AND column_name = 'organizer_id'
    ) THEN
      DELETE FROM public.events
      WHERE organizer_id = ANY(target_ids);
    END IF;
  END IF;

  IF to_regclass('public.hubs') IS NOT NULL THEN
    DELETE FROM public.hubs WHERE owner_id = ANY(target_ids);
  END IF;

  IF to_regclass('public.communities') IS NOT NULL THEN
    DELETE FROM public.communities WHERE owner_id = ANY(target_ids);
  END IF;

  IF to_regclass('public.projects') IS NOT NULL THEN
    DELETE FROM public.projects WHERE owner_id = ANY(target_ids);
  END IF;

  IF to_regclass('public.workspaces') IS NOT NULL THEN
    DELETE FROM public.workspaces WHERE owner_id = ANY(target_ids);
  END IF;

  -- Remove from auth and profile tables. If a trigger/cascade exists, repeated deletes are harmless.
  DELETE FROM auth.users WHERE id = ANY(target_ids);
  DELETE FROM public.profiles WHERE id = ANY(target_ids);

  RAISE NOTICE 'Removed % profiles and related entities.', array_length(target_ids, 1);
END $$;
