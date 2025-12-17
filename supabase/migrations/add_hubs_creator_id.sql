-- Migration: Add creator_id to hubs table
-- Добавляет поле creator_id для отслеживания создателя/организатора хаба

-- Добавляем поле creator_id с внешним ключом на profiles
ALTER TABLE public.hubs 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Создаем индекс для быстрого поиска хабов по создателю
CREATE INDEX IF NOT EXISTS idx_hubs_creator_id ON public.hubs(creator_id);

-- Комментарий к полю для документации
COMMENT ON COLUMN public.hubs.creator_id IS 'ID пользователя, создавшего хаб. Может быть NULL для старых хабов.';

-- Добавляем RLS политики для управления хабами создателем
-- Удаляем политики если они уже существуют (для безопасности)
DROP POLICY IF EXISTS "Creators can update their hubs" ON public.hubs;
DROP POLICY IF EXISTS "Authenticated users can create hubs" ON public.hubs;

CREATE POLICY "Creators can update their hubs"
  ON public.hubs FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "Authenticated users can create hubs"
  ON public.hubs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- Назначение организаторов для существующих хабов
-- ============================================================================

-- Назначаем первого пользователя организатором первого хаба (по ID или created_at)
UPDATE public.hubs
SET creator_id = 'f8646815-26ff-43a0-be78-552919bfc2cc'::uuid
WHERE id = (
  SELECT id 
  FROM public.hubs 
  ORDER BY created_at ASC, id ASC 
  LIMIT 1
)
AND creator_id IS NULL;

-- Назначаем второго пользователя организатором всех остальных хабов
UPDATE public.hubs
SET creator_id = 'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid
WHERE creator_id IS NULL;

