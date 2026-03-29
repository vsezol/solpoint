-- Migration: normalize Twitter/X avatar URLs to higher-quality variants
-- Goal:
-- 1) Backfill existing low-res profile avatars (e.g. *_normal.jpg)
-- 2) Backfill synced twitter_connections avatars (if table/column exists)

-- Profiles: normalize pbs.twimg.com / abs.twimg.com avatar URLs.
UPDATE public.profiles
SET avatar_url = regexp_replace(
  regexp_replace(
    regexp_replace(
      avatar_url,
      '(_normal|_bigger|_mini)(\.[A-Za-z0-9]+)(\?.*)?$',
      E'\\2\\3',
      'i'
    ),
    '(_normal|_bigger|_mini)(\?.*)?$',
    E'\\2',
    'i'
  ),
  '([?&]name=)(small|normal|bigger|mini|thumb)',
  E'\\1orig',
  'i'
)
WHERE avatar_url ~* '^https://(pbs|abs)\.twimg\.com/'
  AND (
    avatar_url ~* '(_normal|_bigger|_mini)(\.[A-Za-z0-9]+)(\?.*)?$'
    OR avatar_url ~* '(_normal|_bigger|_mini)(\?.*)?$'
    OR avatar_url ~* '([?&]name=)(small|normal|bigger|mini|thumb)'
  );

-- Optional table backfill for mutual Twitter followers cache.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'twitter_connections'
      AND column_name = 'twitter_friend_avatar_url'
  ) THEN
    UPDATE public.twitter_connections
    SET twitter_friend_avatar_url = regexp_replace(
      regexp_replace(
        regexp_replace(
          twitter_friend_avatar_url,
          '(_normal|_bigger|_mini)(\.[A-Za-z0-9]+)(\?.*)?$',
          E'\\2\\3',
          'i'
        ),
        '(_normal|_bigger|_mini)(\?.*)?$',
        E'\\2',
        'i'
      ),
      '([?&]name=)(small|normal|bigger|mini|thumb)',
      E'\\1orig',
      'i'
    )
    WHERE twitter_friend_avatar_url ~* '^https://(pbs|abs)\.twimg\.com/'
      AND (
        twitter_friend_avatar_url ~* '(_normal|_bigger|_mini)(\.[A-Za-z0-9]+)(\?.*)?$'
        OR twitter_friend_avatar_url ~* '(_normal|_bigger|_mini)(\?.*)?$'
        OR twitter_friend_avatar_url ~* '([?&]name=)(small|normal|bigger|mini|thumb)'
      );
  END IF;
END $$;
