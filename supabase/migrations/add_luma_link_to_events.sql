-- Migration: Add Luma Link to Events
-- Добавляет поле luma_link для ссылки на событие в Luma

-- Добавляем поле luma_link в таблицу events
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS luma_link TEXT;

-- Комментарий к полю
COMMENT ON COLUMN public.events.luma_link IS 'Link to the event page on Luma platform';


