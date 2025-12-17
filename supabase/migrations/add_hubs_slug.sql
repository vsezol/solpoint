-- Добавление поля slug в таблицу hubs
-- Для создания уникальных публичных ссылок на хабы

-- Добавляем поле slug
ALTER TABLE public.hubs 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Создаем индекс для быстрого поиска по slug
CREATE INDEX IF NOT EXISTS idx_hubs_slug ON public.hubs(slug);

-- Функция для генерации slug из названия и города
CREATE OR REPLACE FUNCTION generate_hub_slug(hub_name TEXT, hub_city TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Генерируем базовый slug из названия
  base_slug := lower(trim(hub_name));
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g'); -- Удаляем спецсимволы
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g'); -- Пробелы в дефисы
  base_slug := regexp_replace(base_slug, '-+', '-', 'g'); -- Множественные дефисы в один
  base_slug := substring(base_slug FROM 1 FOR 50); -- Ограничение длины
  
  -- Добавляем город если есть
  IF hub_city IS NOT NULL AND hub_city != '' THEN
    DECLARE
      city_slug TEXT;
    BEGIN
      city_slug := lower(trim(hub_city));
      city_slug := regexp_replace(city_slug, '[^a-z0-9\s-]', '', 'g');
      city_slug := regexp_replace(city_slug, '\s+', '-', 'g');
      city_slug := regexp_replace(city_slug, '-+', '-', 'g');
      city_slug := substring(city_slug FROM 1 FOR 30);
      base_slug := base_slug || '-' || city_slug;
    END;
  END IF;
  
  -- Проверяем уникальность и добавляем суффикс при необходимости
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.hubs WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
    -- Защита от бесконечного цикла
    IF counter > 1000 THEN
      RAISE EXCEPTION 'Failed to generate unique slug';
    END IF;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Обновляем существующие хабы, генерируя slug для них
DO $$
DECLARE
  hub_record RECORD;
BEGIN
  FOR hub_record IN SELECT id, name, city FROM public.hubs WHERE slug IS NULL LOOP
    UPDATE public.hubs 
    SET slug = generate_hub_slug(hub_record.name, hub_record.city)
    WHERE id = hub_record.id;
  END LOOP;
END $$;

-- Триггер для автоматической генерации slug при создании нового хаба
CREATE OR REPLACE FUNCTION set_hub_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_hub_slug(NEW.name, NEW.city);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hub_slug_trigger
BEFORE INSERT ON public.hubs
FOR EACH ROW
EXECUTE FUNCTION set_hub_slug();

