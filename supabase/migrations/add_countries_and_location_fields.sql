-- Migration: Add countries table and update profile location fields
-- This migration creates the countries reference table and updates profile fields
-- to use ISO country codes instead of full country names
-- Date: 2025-12-14

-- Create countries table
CREATE TABLE IF NOT EXISTS public.countries (
  code CHAR(2) PRIMARY KEY,          -- ISO 3166-1 alpha-2
  name TEXT NOT NULL                 -- Human-readable name (EN or RU)
);

-- NOTE: После выполнения этой миграции выполните seed_countries.sql
-- для заполнения таблицы всеми странами из JSON файла

-- Drop existing country index (будем создавать новый для country_code)
DROP INDEX IF EXISTS public.idx_profiles_country;

-- Сначала делаем существующее поле country nullable
ALTER TABLE public.profiles 
ALTER COLUMN country DROP NOT NULL;

-- Добавляем новое поле country_code
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country_code CHAR(2);

-- Добавляем ограничение на uppercase и проверку длины для country_code
ALTER TABLE public.profiles
ADD CONSTRAINT check_country_code_uppercase 
  CHECK (country_code IS NULL OR country_code = UPPER(country_code));

ALTER TABLE public.profiles
ADD CONSTRAINT check_country_code_length 
  CHECK (country_code IS NULL OR LENGTH(country_code) = 2);

-- Добавляем foreign key на таблицу countries
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_country_code 
  FOREIGN KEY (country_code) REFERENCES public.countries(code)
  ON DELETE SET NULL;

-- Обновляем существующее поле city: добавляем ограничение на длину
ALTER TABLE public.profiles
ADD CONSTRAINT check_city_length 
  CHECK (city IS NULL OR char_length(city) <= 150);

-- Создаем индексы для оптимизации поиска
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON public.profiles(country_code);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);

-- Обновляем view country_stats для использования country_code
DROP VIEW IF EXISTS public.country_stats;
CREATE VIEW public.country_stats AS
SELECT 
  p.country_code,
  c.name as country_name,
  COUNT(DISTINCT p.id) as users_count,
  COUNT(DISTINCT CASE WHEN p.subscription_tier = 'vip' THEN p.id END) as vip_users_count
FROM public.profiles p
LEFT JOIN public.countries c ON p.country_code = c.code
WHERE p.country_code IS NOT NULL
GROUP BY p.country_code, c.name;

-- Комментарии к таблицам и полям
COMMENT ON TABLE public.countries IS 'Reference table for ISO 3166-1 alpha-2 country codes';
COMMENT ON COLUMN public.countries.code IS 'ISO 3166-1 alpha-2 country code (2 characters, uppercase)';
COMMENT ON COLUMN public.countries.name IS 'Human-readable country name';

COMMENT ON COLUMN public.profiles.country_code IS 'ISO 3166-1 alpha-2 country code (nullable, uppercase, 2 chars)';
COMMENT ON COLUMN public.profiles.city IS 'City name (nullable, max 150 characters)';
COMMENT ON COLUMN public.profiles.country IS 'DEPRECATED: Use country_code instead. Will be removed in future migration.';

