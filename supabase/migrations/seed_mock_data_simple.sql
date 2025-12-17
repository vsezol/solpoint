-- ============================================================================
-- ПРОСТАЯ ВЕРСИЯ: Seed Mock Data для SolPoint
-- ============================================================================
-- 
-- ИНСТРУКЦИЯ:
-- 1. Сначала выполните этот запрос, чтобы получить ID существующих пользователей:
--    SELECT id, twitter_handle, country_code, city FROM public.profiles LIMIT 10;
--
-- 2. Замените все вхождения 'YOUR_USER_ID_HERE' на реальные UUID из profiles
--    (или используйте подзапросы, которые уже есть в скрипте)
--
-- 3. Если у вас нет пользователей, сначала создайте их через Supabase Auth
--    или используйте seed_test_users.sql (если создадите такой файл)

-- ============================================================================
-- 1. ХАБЫ
-- ============================================================================

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
    0, -- Будет обновлено триггером при добавлении участников
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
    0,
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
    0,
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
    0,
    '{"twitter": "https://twitter.com/superteamin"}'::jsonb,
    '2022-12-01T00:00:00Z'::timestamptz
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. СОБЫТИЯ
-- ============================================================================

-- Breakpoint 2025
INSERT INTO public.events (
  id, name, description, slug, country, country_code, city, venue_name,
  latitude, longitude, start_date, end_date, timezone, event_type, visibility,
  is_paid, price_sol, price_usd, max_attendees, attendees_count, capacity_remaining,
  registration_deadline, is_online, socials, contacts, organizer_id, hub_id, created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000101'::uuid,
  'Breakpoint 2025',
  'The premier Solana conference bringing together builders, investors, and enthusiasts from around the world.',
  'breakpoint-2025-abu-dhabi-2025-12',
  'UAE', 'AE', 'Abu Dhabi', 'Abu Dhabi National Exhibition Centre',
  24.4539, 54.3773,
  '2025-12-11T00:00:00Z'::timestamptz,
  '2025-12-13T00:00:00Z'::timestamptz,
  'Asia/Dubai', 'official', 'public',
  true, 2.0, 150.00, 5000, 0, 5000,
  '2025-12-01T00:00:00Z'::timestamptz,
  false,
  '{"twitter": "https://twitter.com/solana", "website": "https://breakpoint.solana.com"}'::jsonb,
  '{"email": "info@breakpoint.solana.com", "telegram": "@breakpoint2025"}'::jsonb,
  (SELECT id FROM public.profiles LIMIT 1), -- Первый пользователь как организатор
  NULL,
  '2024-06-01T00:00:00Z'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

-- Solana Hacker House Almaty (привязан к Superteam KZ)
INSERT INTO public.events (
  id, name, description, slug, country, country_code, city, venue_name,
  latitude, longitude, start_date, end_date, timezone, event_type, visibility,
  is_paid, price_sol, price_usd, max_attendees, attendees_count, capacity_remaining,
  registration_deadline, is_online, socials, contacts, organizer_id, hub_id, created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000102'::uuid,
  'Solana Hacker House Almaty',
  'Week-long hacking event for Solana builders in Central Asia.',
  'solana-hacker-house-almaty-2025-03',
  'Kazakhstan', 'KZ', 'Almaty', 'Almaty Tech Hub',
  43.2220, 76.8512,
  '2025-03-15T00:00:00Z'::timestamptz,
  '2025-03-22T00:00:00Z'::timestamptz,
  'Asia/Almaty', 'community', 'public',
  false, NULL, NULL, NULL, 0, NULL,
  '2025-03-10T00:00:00Z'::timestamptz,
  false,
  '{"twitter": "https://twitter.com/superteamkz"}'::jsonb,
  '{"email": "almaty@superteam.fun", "telegram": "@superteamkz"}'::jsonb,
  (SELECT id FROM public.profiles WHERE country_code = 'KZ' LIMIT 1), -- Пользователь из KZ
  '00000000-0000-0000-0000-000000000001'::uuid, -- Superteam KZ
  '2024-12-01T00:00:00Z'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

-- Istanbul Solana Meetup (привязан к Superteam Turkey)
INSERT INTO public.events (
  id, name, description, slug, country, country_code, city, venue_name,
  latitude, longitude, start_date, end_date, timezone, event_type, visibility,
  is_paid, price_sol, price_usd, max_attendees, attendees_count, capacity_remaining,
  registration_deadline, is_online, socials, contacts, organizer_id, hub_id, created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'Istanbul Solana Meetup',
  'Monthly community meetup in Istanbul.',
  'istanbul-solana-meetup-2025-02',
  'Turkey', 'TR', 'Istanbul', 'Istanbul Community Center',
  41.0082, 28.9784,
  '2025-02-20T18:00:00Z'::timestamptz,
  NULL,
  'Europe/Istanbul', 'meetup', 'public',
  false, NULL, NULL, 100, 0, 100,
  '2025-02-18T00:00:00Z'::timestamptz,
  false,
  '{"twitter": "https://twitter.com/solana_istanbul"}'::jsonb,
  '{"telegram": "@solana_istanbul"}'::jsonb,
  (SELECT id FROM public.profiles WHERE country_code = 'TR' LIMIT 1), -- Пользователь из TR
  '00000000-0000-0000-0000-000000000002'::uuid, -- Superteam Turkey
  '2025-01-15T00:00:00Z'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

-- VIP Networking Dinner (привязан к Superteam UAE)
INSERT INTO public.events (
  id, name, description, slug, country, country_code, city, venue_name,
  latitude, longitude, start_date, end_date, timezone, event_type, visibility,
  is_paid, price_sol, price_usd, max_attendees, attendees_count, capacity_remaining,
  registration_deadline, is_online, socials, contacts, organizer_id, hub_id, created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000104'::uuid,
  'VIP Networking Dinner',
  'Exclusive dinner for Solana VIPs in Dubai.',
  'vip-networking-dinner-dubai-2025-02',
  'UAE', 'AE', 'Dubai', 'Burj Al Arab',
  25.2048, 55.2708,
  '2025-02-28T19:00:00Z'::timestamptz,
  NULL,
  'Asia/Dubai', 'private', 'vip_only',
  true, 5.0, 375.00, 30, 0, 30,
  '2025-02-25T00:00:00Z'::timestamptz,
  false,
  '{}'::jsonb,
  '{"email": "vip@superteamuae.com"}'::jsonb,
  (SELECT id FROM public.profiles WHERE subscription_tier = 'vip' AND country_code = 'AE' LIMIT 1), -- VIP из UAE
  '00000000-0000-0000-0000-000000000003'::uuid, -- Superteam UAE
  '2025-01-20T00:00:00Z'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

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
ON CONFLICT (hub_id, user_id) DO NOTHING;

INSERT INTO public.hub_members (hub_id, user_id, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000002'::uuid, -- Superteam Turkey
  id,
  '2023-08-20T00:00:00Z'::timestamptz
FROM public.profiles
WHERE country_code = 'TR' OR city = 'Istanbul'
ON CONFLICT (hub_id, user_id) DO NOTHING;

INSERT INTO public.hub_members (hub_id, user_id, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000003'::uuid, -- Superteam UAE
  id,
  '2023-04-10T00:00:00Z'::timestamptz
FROM public.profiles
WHERE country_code = 'AE' OR city IN ('Dubai', 'Abu Dhabi')
ON CONFLICT (hub_id, user_id) DO NOTHING;

INSERT INTO public.hub_members (hub_id, user_id, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000004'::uuid, -- Superteam India
  id,
  '2022-12-10T00:00:00Z'::timestamptz
FROM public.profiles
WHERE country_code = 'IN' OR city = 'Bangalore'
ON CONFLICT (hub_id, user_id) DO NOTHING;

-- ============================================================================
-- 4. УЧАСТНИКИ СОБЫТИЙ (EVENT_MEMBERS)
-- ============================================================================

-- Breakpoint 2025 - добавляем участников
INSERT INTO public.event_members (event_id, user_id, status, registered_at)
SELECT 
  '00000000-0000-0000-0000-000000000101'::uuid,
  id,
  'going',
  '2024-06-15T00:00:00Z'::timestamptz
FROM public.profiles
WHERE country_code = 'AE' OR subscription_tier = 'vip'
LIMIT 10
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Solana Hacker House Almaty - добавляем участников с разными статусами
INSERT INTO public.event_members (event_id, user_id, status, registered_at)
SELECT 
  '00000000-0000-0000-0000-000000000102'::uuid,
  id,
  CASE (ROW_NUMBER() OVER ())::integer % 3
    WHEN 0 THEN 'going'
    WHEN 1 THEN 'maybe'
    ELSE 'not_going'
  END,
  '2024-12-05T00:00:00Z'::timestamptz
FROM public.profiles
WHERE country_code = 'KZ' OR city = 'Almaty' OR role = 'developer'
LIMIT 8
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Istanbul Solana Meetup
INSERT INTO public.event_members (event_id, user_id, status, registered_at)
SELECT 
  '00000000-0000-0000-0000-000000000103'::uuid,
  id,
  CASE (ROW_NUMBER() OVER ())::integer % 2
    WHEN 0 THEN 'going'
    ELSE 'maybe'
  END,
  '2025-01-20T00:00:00Z'::timestamptz
FROM public.profiles
WHERE country_code = 'TR' OR city = 'Istanbul'
LIMIT 6
ON CONFLICT (event_id, user_id) DO NOTHING;

-- VIP Networking Dinner - только VIP пользователи
INSERT INTO public.event_members (event_id, user_id, status, registered_at)
SELECT 
  '00000000-0000-0000-0000-000000000104'::uuid,
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

-- Breakpoint 2025 - добавляем спикеров
INSERT INTO public.event_speakers (event_id, user_id, topic, bio, "order")
SELECT 
  '00000000-0000-0000-0000-000000000101'::uuid,
  id,
  CASE role
    WHEN 'developer' THEN 'Building on Solana: Best Practices'
    WHEN 'founder' THEN 'Startup Journey in Web3'
    WHEN 'investor' THEN 'Investment Trends in Solana Ecosystem'
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
  '00000000-0000-0000-0000-000000000102'::uuid,
  id,
  'Hacking Session: Building dApps on Solana',
  bio,
  ROW_NUMBER() OVER ()::integer
FROM public.profiles
WHERE role = 'developer' AND (country_code = 'KZ' OR city = 'Almaty')
LIMIT 2
ON CONFLICT (event_id, user_id) DO NOTHING;

-- ============================================================================
-- ГОТОВО!
-- ============================================================================
-- 
-- Проверьте данные:
-- SELECT * FROM public.hubs;
-- SELECT * FROM public.events ORDER BY start_date;
-- SELECT * FROM public.hub_members;
-- SELECT * FROM public.event_members;
-- SELECT * FROM public.event_speakers;
--
-- Триггеры автоматически обновят:
-- - members_count в hubs
-- - attendees_count и capacity_remaining в events

