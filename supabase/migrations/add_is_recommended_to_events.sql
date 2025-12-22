-- Migration: Add is_recommended field to events table
-- Добавляет поле для отметки рекомендованных событий
-- Date: 2024

-- Добавляем поле is_recommended (необязательное, по умолчанию false)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false;

-- Создаем индекс для быстрой фильтрации рекомендованных событий
CREATE INDEX IF NOT EXISTS idx_events_is_recommended ON public.events(is_recommended) WHERE is_recommended = true;

-- Комментарий для документации
COMMENT ON COLUMN public.events.is_recommended IS 'Флаг рекомендованного события. Рекомендованные события показываются в приоритете на странице событий.';

