-- Migration: Update workspaces country_code from TEXT to CHAR(2)
-- Description: Changes country_code type to CHAR(2) with constraints to match other entities
-- Date: 2024

-- 1. Удаляем старый индекс, если он существует
DROP INDEX IF EXISTS public.idx_workspaces_country_code;

-- 2. Удаляем старые constraints, если они есть (на случай если были добавлены вручную)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_workspaces_country_code_uppercase'
  ) THEN
    ALTER TABLE public.workspaces
      DROP CONSTRAINT check_workspaces_country_code_uppercase;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_workspaces_country_code_length'
  ) THEN
    ALTER TABLE public.workspaces
      DROP CONSTRAINT check_workspaces_country_code_length;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_workspaces_country_code'
  ) THEN
    ALTER TABLE public.workspaces
      DROP CONSTRAINT fk_workspaces_country_code;
  END IF;
END $$;

-- 3. Обновляем существующие значения: обрезаем до 2 символов и приводим к uppercase
UPDATE public.workspaces
SET country_code = UPPER(LEFT(country_code, 2))
WHERE country_code IS NOT NULL AND LENGTH(country_code) > 2;

-- 4. Удаляем значения, которые не являются валидными кодами (не 2 символа)
UPDATE public.workspaces
SET country_code = NULL
WHERE country_code IS NOT NULL AND LENGTH(country_code) != 2;

-- 5. Изменяем тип колонки с TEXT на CHAR(2)
ALTER TABLE public.workspaces
  ALTER COLUMN country_code TYPE CHAR(2) USING country_code::CHAR(2);

-- 6. Добавляем constraint для uppercase
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_workspaces_country_code_uppercase'
  ) THEN
    ALTER TABLE public.workspaces
      ADD CONSTRAINT check_workspaces_country_code_uppercase 
      CHECK (country_code IS NULL OR country_code = UPPER(country_code));
  END IF;
END $$;

-- 7. Добавляем constraint для длины (должно быть 2 символа)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_workspaces_country_code_length'
  ) THEN
    ALTER TABLE public.workspaces
      ADD CONSTRAINT check_workspaces_country_code_length 
      CHECK (country_code IS NULL OR LENGTH(country_code) = 2);
  END IF;
END $$;

-- 8. Добавляем foreign key на таблицу countries
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_workspaces_country_code'
  ) THEN
    ALTER TABLE public.workspaces
      ADD CONSTRAINT fk_workspaces_country_code 
      FOREIGN KEY (country_code) REFERENCES public.countries(code)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 9. Создаем индекс для country_code
CREATE INDEX IF NOT EXISTS idx_workspaces_country_code ON public.workspaces(country_code);

-- 10. Обновляем комментарий
COMMENT ON COLUMN public.workspaces.country_code IS 'ISO 3166-1 alpha-2 country code (nullable, uppercase, 2 chars)';


