-- Migration: Make Luma Link Required
-- Обновляет существующие ивенты без luma_link моковыми ссылками и делает поле обязательным

-- Обновляем все существующие ивенты без luma_link, добавляя моковую ссылку
UPDATE public.events 
SET luma_link = 'https://example.com/event/' || id
WHERE luma_link IS NULL OR luma_link = '';

-- Делаем поле обязательным
ALTER TABLE public.events 
  ALTER COLUMN luma_link SET NOT NULL;


