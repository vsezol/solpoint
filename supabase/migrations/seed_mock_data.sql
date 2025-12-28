-- Seed Mock Data for SolPoint
-- Заполнение базы данных тестовыми данными: хабы, события, участники
-- 
-- ВАЖНО: Перед выполнением убедитесь, что:
-- 1. Применены все миграции (особенно add_events_enhancements.sql)
-- 2. В таблице profiles есть пользователи с ID, которые будут использоваться как организаторы
-- 
-- Если у вас нет пользователей в profiles, сначала создайте их через auth или вставьте тестовые профили

-- ============================================================================
-- 1. ХАБЫ (HUBS)
-- ============================================================================

-- Вставляем хабы
-- Примечание: Если хабы уже существуют, используйте ON CONFLICT или удалите их сначала

INSERT INTO public.hubs (id, name, description, image_url, country, city, latitude, longitude, members_count, socials, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Superteam KZ',
    'Superteam is a global, decentralized network of top builders, investors, and developers focused on accelerating the growth and adoption of the Solana ecosystem.',
    NULL,
    'Kazakhstan',
    'Almaty',
    43.2566,
    76.9286,
    250,
    '{"twitter": "https://twitter.com/superteamkz", "website": "https://superteam.fun"}'::jsonb,
    '2023-06-01T00:00:00Z'::timestamptz
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Superteam Turkey',
    'Building the Solana ecosystem in Turkey.',
    NULL,
    'Turkey',
    NULL,
    39.9334,
    32.8597,
    180,
    '{"twitter": "https://twitter.com/superteamtr"}'::jsonb,
    '2023-08-15T00:00:00Z'::timestamptz
  ),
  (
    '00000000-0000-0000-0000-000000000003'::uuid,
    'Superteam UAE',
    'Solana builders community in UAE.',
    NULL,
    'UAE',
    'Dubai',
    25.0657,
    55.1713,
    320,
    '{"twitter": "https://twitter.com/superteamuae"}'::jsonb,
    '2023-04-01T00:00:00Z'::timestamptz
  ),
  (
    '00000000-0000-0000-0000-000000000004'::uuid,
    'Superteam India',
    'India''s largest Solana community.',
    NULL,
    'India',
    'Bangalore',
    12.9716,
    77.5946,
    850,
    '{"twitter": "https://twitter.com/superteamin"}'::jsonb,
    '2022-12-01T00:00:00Z'::timestamptz
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  country = EXCLUDED.country,
  city = EXCLUDED.city,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  socials = EXCLUDED.socials;

-- ============================================================================
-- 2. СОБЫТИЯ (EVENTS)
-- ============================================================================

-- UUID организатора: bec61439-31c9-47e4-85a2-f2c1801542e7

-- Breakpoint 2025 (UAE, Abu Dhabi)
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
  '00000000-0000-0000-0000-000000000101'::uuid,
  'Breakpoint 2025',
  'The premier Solana conference bringing together builders, investors, and enthusiasts from around the world.',
  NULL,
  'breakpoint-2025-abu-dhabi-2025-12',
  'UAE',
  'AE',
  'Abu Dhabi',
  NULL,
  'Abu Dhabi National Exhibition Centre',
  24.4539,
  54.3773,
  '2025-12-11T00:00:00Z'::timestamptz,
  '2025-12-13T00:00:00Z'::timestamptz,
  'Asia/Dubai',
  'official',
  'public',
  true,
  2.0,
  150.00,
  5000,
  3200,
  1800,
  '2025-12-01T00:00:00Z'::timestamptz,
  false,
  '{"twitter": "https://twitter.com/solana", "website": "https://breakpoint.solana.com"}'::jsonb,
  '{"email": "info@breakpoint.solana.com", "telegram": "@breakpoint2025"}'::jsonb,
  'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid, -- Организатор
  NULL, -- Не привязан к хабу
  '2024-06-01T00:00:00Z'::timestamptz
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
  is_paid = EXCLUDED.is_paid,
  price_sol = EXCLUDED.price_sol,
  price_usd = EXCLUDED.price_usd,
  max_attendees = EXCLUDED.max_attendees,
  capacity_remaining = EXCLUDED.capacity_remaining,
  registration_deadline = EXCLUDED.registration_deadline,
  is_online = EXCLUDED.is_online,
  socials = EXCLUDED.socials,
  contacts = EXCLUDED.contacts;

-- Solana Hacker House Almaty (Kazakhstan, Almaty) - привязан к Superteam KZ
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
  '00000000-0000-0000-0000-000000000102'::uuid,
  'Solana Hacker House Almaty',
  'Week-long hacking event for Solana builders in Central Asia.',
  NULL,
  'solana-hacker-house-almaty-2025-03',
  'Kazakhstan',
  'KZ',
  'Almaty',
  NULL,
  'Almaty Tech Hub',
  43.2220,
  76.8512,
  '2025-03-15T00:00:00Z'::timestamptz,
  '2025-03-22T00:00:00Z'::timestamptz,
  'Asia/Almaty',
  'community',
  'public',
  false,
  NULL,
  NULL,
  NULL,
  150,
  NULL,
  '2025-03-10T00:00:00Z'::timestamptz,
  false,
  '{"twitter": "https://twitter.com/superteamkz"}'::jsonb,
  '{"email": "almaty@superteam.fun", "telegram": "@superteamkz"}'::jsonb,
  'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid, -- Организатор
  '00000000-0000-0000-0000-000000000001'::uuid, -- Superteam KZ
  '2024-12-01T00:00:00Z'::timestamptz
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
  is_online = EXCLUDED.is_online,
  socials = EXCLUDED.socials,
  contacts = EXCLUDED.contacts;

-- Istanbul Solana Meetup (Turkey, Istanbul) - привязан к Superteam Turkey
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
  '00000000-0000-0000-0000-000000000103'::uuid,
  'Istanbul Solana Meetup',
  'Monthly community meetup in Istanbul.',
  NULL,
  'istanbul-solana-meetup-2025-02',
  'Turkey',
  'TR',
  'Istanbul',
  NULL,
  'Istanbul Community Center',
  41.0082,
  28.9784,
  '2025-02-20T18:00:00Z'::timestamptz,
  NULL,
  'Europe/Istanbul',
  'meetup',
  'public',
  false,
  NULL,
  NULL,
  100,
  45,
  55,
  '2025-02-18T00:00:00Z'::timestamptz,
  false,
  '{"twitter": "https://twitter.com/solana_istanbul"}'::jsonb,
  '{"telegram": "@solana_istanbul"}'::jsonb,
  'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid, -- Организатор
  '00000000-0000-0000-0000-000000000002'::uuid, -- Superteam Turkey
  '2025-01-15T00:00:00Z'::timestamptz
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
  timezone = EXCLUDED.timezone,
  hub_id = EXCLUDED.hub_id,
  max_attendees = EXCLUDED.max_attendees,
  capacity_remaining = EXCLUDED.capacity_remaining,
  registration_deadline = EXCLUDED.registration_deadline,
  is_online = EXCLUDED.is_online,
  socials = EXCLUDED.socials,
  contacts = EXCLUDED.contacts;

-- VIP Networking Dinner (UAE, Dubai) - привязан к Superteam UAE
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
  '00000000-0000-0000-0000-000000000104'::uuid,
  'VIP Networking Dinner',
  'Exclusive dinner for Solana VIPs in Dubai.',
  NULL,
  'vip-networking-dinner-dubai-2025-02',
  'UAE',
  'AE',
  'Dubai',
  NULL,
  'Burj Al Arab',
  25.2048,
  55.2708,
  '2025-02-28T19:00:00Z'::timestamptz,
  NULL,
  'Asia/Dubai',
  'private',
  'vip_only',
  true,
  5.0,
  375.00,
  30,
  25,
  5,
  '2025-02-25T00:00:00Z'::timestamptz,
  false,
  '{}'::jsonb,
  '{"email": "vip@superteamuae.com"}'::jsonb,
  'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid, -- Организатор
  '00000000-0000-0000-0000-000000000003'::uuid, -- Superteam UAE
  '2025-01-20T00:00:00Z'::timestamptz
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
  timezone = EXCLUDED.timezone,
  visibility = EXCLUDED.visibility,
  is_paid = EXCLUDED.is_paid,
  price_sol = EXCLUDED.price_sol,
  price_usd = EXCLUDED.price_usd,
  max_attendees = EXCLUDED.max_attendees,
  capacity_remaining = EXCLUDED.capacity_remaining,
  registration_deadline = EXCLUDED.registration_deadline,
  hub_id = EXCLUDED.hub_id,
  is_online = EXCLUDED.is_online,
  contacts = EXCLUDED.contacts;

-- ============================================================================
-- 3. УЧАСТНИКИ ХАБОВ (HUB_MEMBERS)
-- ============================================================================

-- Добавляем пользователей в хабы по их локации
INSERT INTO public.hub_members (hub_id, user_id, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid, -- Superteam KZ
  id,
  '2023-06-15T00:00:00Z'::timestamptz
FROM public.profiles
WHERE country_code = 'KZ' OR city = 'Almaty'
LIMIT 5
ON CONFLICT (hub_id, user_id) DO NOTHING;

-- Superteam Turkey - добавляем пользователей
INSERT INTO public.hub_members (hub_id, user_id, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000002'::uuid, -- Superteam Turkey
  id,
  '2023-08-20T00:00:00Z'::timestamptz
FROM public.profiles
WHERE country_code = 'TR' OR city = 'Istanbul'
LIMIT 5
ON CONFLICT (hub_id, user_id) DO NOTHING;

-- Superteam UAE - добавляем пользователей
INSERT INTO public.hub_members (hub_id, user_id, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000003'::uuid, -- Superteam UAE
  id,
  '2023-04-10T00:00:00Z'::timestamptz
FROM public.profiles
WHERE country_code = 'AE' OR city IN ('Dubai', 'Abu Dhabi')
LIMIT 5
ON CONFLICT (hub_id, user_id) DO NOTHING;

-- Superteam India - добавляем пользователей
INSERT INTO public.hub_members (hub_id, user_id, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000004'::uuid, -- Superteam India
  id,
  '2022-12-10T00:00:00Z'::timestamptz
FROM public.profiles
WHERE country_code = 'IN' OR city = 'Bangalore'
LIMIT 5
ON CONFLICT (hub_id, user_id) DO NOTHING;

-- ============================================================================
-- 4. УЧАСТНИКИ СОБЫТИЙ (EVENT_MEMBERS)
-- ============================================================================

-- Breakpoint 2025 - добавляем участников со статусом "going"
INSERT INTO public.event_members (event_id, user_id, status, registered_at)
SELECT 
  '00000000-0000-0000-0000-000000000101'::uuid, -- Breakpoint 2025
  id,
  'going',
  '2024-06-15T00:00:00Z'::timestamptz
FROM public.profiles
WHERE country_code = 'AE' OR subscription_tier = 'vip'
LIMIT 10
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Solana Hacker House Almaty - добавляем участников
INSERT INTO public.event_members (event_id, user_id, status, registered_at)
SELECT 
  '00000000-0000-0000-0000-000000000102'::uuid, -- Solana Hacker House Almaty
  id,
  CASE 
    WHEN random() < 0.7 THEN 'going'
    WHEN random() < 0.9 THEN 'maybe'
    ELSE 'not_going'
  END::text,
  '2024-12-05T00:00:00Z'::timestamptz
FROM public.profiles
WHERE country_code = 'KZ' OR city = 'Almaty' OR role = 'developer'
LIMIT 8
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Istanbul Solana Meetup - добавляем участников
INSERT INTO public.event_members (event_id, user_id, status, registered_at)
SELECT 
  '00000000-0000-0000-0000-000000000103'::uuid, -- Istanbul Solana Meetup
  id,
  CASE 
    WHEN random() < 0.8 THEN 'going'
    ELSE 'maybe'
  END::text,
  '2025-01-20T00:00:00Z'::timestamptz
FROM public.profiles
WHERE country_code = 'TR' OR city = 'Istanbul'
LIMIT 6
ON CONFLICT (event_id, user_id) DO NOTHING;

-- VIP Networking Dinner - добавляем только VIP пользователей
INSERT INTO public.event_members (event_id, user_id, status, registered_at)
SELECT 
  '00000000-0000-0000-0000-000000000104'::uuid, -- VIP Networking Dinner
  id,
  'going',
  '2025-01-25T00:00:00Z'::timestamptz
FROM public.profiles
WHERE subscription_tier = 'vip' AND (country_code = 'AE' OR city IN ('Dubai', 'Abu Dhabi'))
LIMIT 5
ON CONFLICT (event_id, user_id) DO NOTHING;

-- ============================================================================
-- 5. СПИКЕРЫ СОБЫТИЙ (EVENT_SPEAKERS)
-- ============================================================================

-- Добавляем спикеров событий
INSERT INTO public.event_speakers (event_id, user_id, topic, bio, "order")
SELECT 
  '00000000-0000-0000-0000-000000000101'::uuid, -- Breakpoint 2025
  id,
  CASE 
    WHEN role = 'developer' THEN 'Building on Solana: Best Practices'
    WHEN role = 'founder' THEN 'Startup Journey in Web3'
    WHEN role = 'investor' THEN 'Investment Trends in Solana Ecosystem'
    ELSE 'Solana Ecosystem Overview'
  END,
  bio,
  ROW_NUMBER() OVER ()::integer
FROM public.profiles
WHERE subscription_tier = 'vip' AND role IN ('developer', 'founder', 'investor')
LIMIT 3
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Solana Hacker House Almaty - добавляем спикеров
INSERT INTO public.event_speakers (event_id, user_id, topic, bio, "order")
SELECT 
  '00000000-0000-0000-0000-000000000102'::uuid, -- Solana Hacker House Almaty
  id,
  'Hacking Session: Building dApps on Solana',
  bio,
  ROW_NUMBER() OVER ()::integer
FROM public.profiles
WHERE role = 'developer' AND (country_code = 'KZ' OR city = 'Almaty')
LIMIT 2
ON CONFLICT (event_id, user_id) DO NOTHING;

-- ============================================================================
-- ПРИМЕЧАНИЯ
-- ============================================================================
-- 
-- 1. Все события созданы с организатором: bec61439-31c9-47e4-85a2-f2c1801542e7
--
-- 2. Участники хабов и событий добавляются автоматически на основе их локации
--    из таблицы profiles. Если у вас нет пользователей с подходящей локацией,
--    они не будут добавлены.
--
-- 3. Триггеры автоматически обновят:
--    - attendees_count в events при добавлении/удалении event_members
--    - members_count в hubs при добавлении/удалении hub_members
--    - capacity_remaining в events при изменении attendees_count или max_attendees
--
-- 4. Для проверки данных выполните:
--    SELECT * FROM public.hubs;
--    SELECT * FROM public.events;
--    SELECT * FROM public.hub_members;
--    SELECT * FROM public.event_members;
--    SELECT * FROM public.event_speakers;

