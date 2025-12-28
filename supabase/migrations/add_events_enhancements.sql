-- Migration: Events Enhancements
-- Добавляет новые поля для событий, создает event_members и event_speakers

-- 1. Обновление таблицы events - добавление новых полей
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS country_code TEXT, -- ISO 3166-1 alpha-2
  ADD COLUMN IF NOT EXISTS venue_name TEXT, -- Название места проведения
  ADD COLUMN IF NOT EXISTS timezone TEXT, -- Часовой пояс
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false, -- Онлайн/офлайн
  ADD COLUMN IF NOT EXISTS capacity_remaining INTEGER, -- Оставшиеся места
  ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ, -- Дедлайн регистрации
  ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10, 2), -- Цена в долларах
  ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '{}', -- Контакты организатора (email, telegram, phone, other)
  ADD COLUMN IF NOT EXISTS hub_id UUID REFERENCES public.hubs(id) ON DELETE SET NULL; -- Связь с хабом

-- 2. Создание таблицы event_members (заменяет event_attendees с дополнительными полями)
CREATE TABLE IF NOT EXISTS public.event_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- 3. Миграция данных из event_attendees в event_members (если есть данные)
INSERT INTO public.event_members (event_id, user_id, status, registered_at)
SELECT event_id, user_id, 'going', registered_at
FROM public.event_attendees
ON CONFLICT (event_id, user_id) DO NOTHING;

-- 4. Создание таблицы event_speakers
CREATE TABLE IF NOT EXISTS public.event_speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT, -- Тема выступления
  bio TEXT, -- Краткая биография для этого ивента
  "order" INTEGER DEFAULT 0, -- Порядок выступления
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id) -- Один спикер может быть только один раз на ивенте
);

-- 5. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_hub_id ON public.events(hub_id);
CREATE INDEX IF NOT EXISTS idx_events_country_code ON public.events(country_code);
CREATE INDEX IF NOT EXISTS idx_events_registration_deadline ON public.events(registration_deadline);
CREATE INDEX IF NOT EXISTS idx_events_is_online ON public.events(is_online);
CREATE INDEX IF NOT EXISTS idx_events_location_date ON public.events(country_code, city, start_date);

CREATE INDEX IF NOT EXISTS idx_event_members_event_id ON public.event_members(event_id);
CREATE INDEX IF NOT EXISTS idx_event_members_user_id ON public.event_members(user_id);
CREATE INDEX IF NOT EXISTS idx_event_members_status ON public.event_members(status);

CREATE INDEX IF NOT EXISTS idx_event_speakers_event_id ON public.event_speakers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_speakers_user_id ON public.event_speakers(user_id);
CREATE INDEX IF NOT EXISTS idx_event_speakers_order ON public.event_speakers(event_id, "order");

-- 6. Функция для обновления capacity_remaining
CREATE OR REPLACE FUNCTION update_event_capacity_remaining()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.events 
  SET capacity_remaining = GREATEST(0, COALESCE(max_attendees, 0) - attendees_count)
  WHERE id = COALESCE(NEW.id, OLD.id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления capacity_remaining при изменении attendees_count
CREATE TRIGGER event_capacity_remaining_trigger
AFTER UPDATE OF attendees_count, max_attendees ON public.events
FOR EACH ROW
WHEN (OLD.attendees_count IS DISTINCT FROM NEW.attendees_count OR OLD.max_attendees IS DISTINCT FROM NEW.max_attendees)
EXECUTE FUNCTION update_event_capacity_remaining();

-- 7. Обновление триггера для event_members (вместо event_attendees)
CREATE OR REPLACE FUNCTION update_event_members_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.events 
    SET attendees_count = attendees_count + 1,
        capacity_remaining = GREATEST(0, COALESCE(max_attendees, 0) - (attendees_count + 1))
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.events 
    SET attendees_count = attendees_count - 1,
        capacity_remaining = GREATEST(0, COALESCE(max_attendees, 0) - (attendees_count - 1))
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старый триггер для event_attendees
DROP TRIGGER IF EXISTS event_attendees_count_trigger ON public.event_attendees;

-- Создаем новый триггер для event_members
CREATE TRIGGER event_members_count_trigger
AFTER INSERT OR DELETE ON public.event_members
FOR EACH ROW EXECUTE FUNCTION update_event_members_count();

-- 8. Row Level Security (RLS) для новых таблиц
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_speakers ENABLE ROW LEVEL SECURITY;

-- Политики для event_members
CREATE POLICY "Event members are viewable by authenticated users"
  ON public.event_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can register for events"
  ON public.event_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own event membership"
  ON public.event_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can unregister from events"
  ON public.event_members FOR DELETE
  USING (auth.uid() = user_id);

-- Политики для event_speakers
CREATE POLICY "Event speakers are viewable by everyone"
  ON public.event_speakers FOR SELECT
  USING (true);

CREATE POLICY "Organizers can add speakers to their events"
  ON public.event_speakers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_id 
      AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can update speakers of their events"
  ON public.event_speakers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_id 
      AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can remove speakers from their events"
  ON public.event_speakers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_id 
      AND organizer_id = auth.uid()
    )
  );

-- 9. Обновление политики для events - добавить hub_id в UPDATE
DROP POLICY IF EXISTS "Organizers can update their events" ON public.events;

CREATE POLICY "Organizers can update their events"
  ON public.events FOR UPDATE
  USING (organizer_id = auth.uid() OR hub_id IN (
    SELECT hub_id FROM public.hub_members 
    WHERE user_id = auth.uid() 
    AND hub_id IS NOT NULL
  ));

-- 10. Функция для генерации slug (опционально, можно использовать на бэкенде)
-- Здесь просто пример, реальная генерация будет в TypeScript
COMMENT ON COLUMN public.events.slug IS 'Unique slug for public URL, format: event-name-city-year-month';

-- Примечание: event_attendees можно удалить после проверки миграции данных
-- DROP TABLE IF EXISTS public.event_attendees;

