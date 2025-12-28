-- Добавление upcoming ивента: Solana Builders Summit Almaty
-- Привязан к Superteam KZ, дата: 15 июня 2026 (будущее событие)

-- Solana Builders Summit Almaty (Kazakhstan, Almaty) - привязан к Superteam KZ
INSERT INTO public.events (
  id,
  name,
  description,
  image_url,
  slug,
  country,
  country_code,
  city,
  address,
  venue_name,
  latitude,
  longitude,
  start_date,
  end_date,
  timezone,
  event_type,
  visibility,
  is_paid,
  price_sol,
  price_usd,
  max_attendees,
  attendees_count,
  capacity_remaining,
  registration_deadline,
  is_online,
  socials,
  contacts,
  organizer_id,
  hub_id,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'Solana Builders Summit Almaty',
  'Join us for a day of workshops, networking, and talks from top Solana builders in Central Asia. Learn about the latest tools, best practices, and connect with the community.',
  NULL,
  'solana-builders-summit-almaty-2026-06',
  'Kazakhstan',
  'KZ',
  'Almaty',
  NULL,
  'Almaty Innovation Hub',
  43.2566,
  76.9286,
  '2026-06-15T10:00:00Z'::timestamptz,
  '2026-06-15T18:00:00Z'::timestamptz,
  'Asia/Almaty',
  'community',
  'public',
  false,
  NULL,
  NULL,
  200,
  0,
  200,
  '2026-06-10T00:00:00Z'::timestamptz,
  false,
  '{"twitter": "https://twitter.com/superteamkz", "website": "https://superteam.fun"}'::jsonb,
  '{"email": "summit@superteamkz.com", "telegram": "@superteamkz"}'::jsonb,
  'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid, -- Организатор
  '00000000-0000-0000-0000-000000000001'::uuid, -- Superteam KZ
  NOW() -- Текущая дата создания
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  slug = EXCLUDED.slug,
  country = EXCLUDED.country,
  country_code = EXCLUDED.country_code,
  city = EXCLUDED.city,
  venue_name = EXCLUDED.venue_name,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  timezone = EXCLUDED.timezone,
  hub_id = EXCLUDED.hub_id,
  max_attendees = EXCLUDED.max_attendees,
  capacity_remaining = EXCLUDED.capacity_remaining,
  registration_deadline = EXCLUDED.registration_deadline,
  is_online = EXCLUDED.is_online,
  socials = EXCLUDED.socials,
  contacts = EXCLUDED.contacts;

-- Добавляем участников для Solana Builders Summit Almaty
INSERT INTO public.event_members (event_id, user_id, status, registered_at)
SELECT 
  '00000000-0000-0000-0000-000000000105'::uuid, -- Solana Builders Summit Almaty
  id,
  CASE 
    WHEN random() < 0.8 THEN 'going'
    ELSE 'maybe'
  END::text,
  NOW() -- Текущая дата регистрации
FROM public.profiles
WHERE country_code = 'KZ' OR city = 'Almaty' OR role IN ('developer', 'founder')
LIMIT 10
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Добавляем спикеров для Solana Builders Summit Almaty
INSERT INTO public.event_speakers (event_id, user_id, topic, bio, "order")
SELECT 
  '00000000-0000-0000-0000-000000000105'::uuid, -- Solana Builders Summit Almaty
  id,
  CASE role
    WHEN 'developer' THEN 'Advanced Solana Development Patterns'
    WHEN 'founder' THEN 'Building Successful Web3 Startups'
    WHEN 'investor' THEN 'Investment Opportunities in Solana'
    ELSE 'Solana Ecosystem Growth'
  END,
  bio,
  ROW_NUMBER() OVER ()::integer
FROM public.profiles
WHERE role IN ('developer', 'founder', 'investor') AND (country_code = 'KZ' OR city = 'Almaty')
LIMIT 3
ON CONFLICT (event_id, user_id) DO NOTHING;


