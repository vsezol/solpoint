-- Migration: Add country_code column to workspaces table
-- Добавляет колонку country_code для фильтрации по коду страны

-- Добавляем колонку country_code, если её нет
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Создаем индекс для country_code, если его нет
CREATE INDEX IF NOT EXISTS idx_workspaces_country_code ON public.workspaces(country_code);

-- Комментарий
COMMENT ON COLUMN public.workspaces.country_code IS 'Код страны (ISO 3166-1 alpha-2) для фильтрации';

