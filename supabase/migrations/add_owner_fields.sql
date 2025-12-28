-- Migration: Add owner_id and owner_type fields to all entities
-- Добавляет унифицированные поля owner для всех сущностей
-- Старые поля organizer_id и creator_id остаются для обратной совместимости

-- 1. Создать enum для типов владельцев
DO $$ BEGIN
    CREATE TYPE owner_type AS ENUM ('user', 'hub', 'community', 'project');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Добавить owner_id и owner_type для events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS owner_type owner_type,
  ADD COLUMN IF NOT EXISTS owner_id UUID;

-- 3. Добавить owner_id для hubs, communities, projects
ALTER TABLE public.hubs
  ADD COLUMN IF NOT EXISTS owner_id UUID;

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS owner_id UUID;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS owner_id UUID;

-- 4. Заполнить owner_id из существующих полей
-- Для events: если есть hub_id, community_id или project_id, используем их, иначе organizer_id
-- Проверяем, что hub_id, community_id, project_id существуют в соответствующих таблицах
UPDATE public.events e
SET 
  owner_type = CASE 
    WHEN e.hub_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.hubs WHERE id = e.hub_id) THEN 'hub'::owner_type
    WHEN e.community_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.communities WHERE id = e.community_id) THEN 'community'::owner_type
    WHEN e.project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects WHERE id = e.project_id) THEN 'project'::owner_type
    ELSE 'user'::owner_type
  END,
  owner_id = CASE
    WHEN e.hub_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.hubs WHERE id = e.hub_id) THEN e.hub_id
    WHEN e.community_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.communities WHERE id = e.community_id) THEN e.community_id
    WHEN e.project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects WHERE id = e.project_id) THEN e.project_id
    ELSE e.organizer_id
  END
WHERE e.owner_id IS NULL 
  AND (e.organizer_id IS NOT NULL OR e.hub_id IS NOT NULL OR e.community_id IS NOT NULL OR e.project_id IS NOT NULL);

-- Для hubs, communities, projects: копируем creator_id в owner_id
UPDATE public.hubs
SET owner_id = creator_id
WHERE owner_id IS NULL AND creator_id IS NOT NULL;

UPDATE public.communities
SET owner_id = creator_id
WHERE owner_id IS NULL AND creator_id IS NOT NULL;

UPDATE public.projects
SET owner_id = creator_id
WHERE owner_id IS NULL AND creator_id IS NOT NULL;

-- 5. Установить NOT NULL после заполнения данных
-- Для events: owner_type и owner_id обязательны
-- Но только если все записи имеют эти поля заполненными
-- Если есть записи без owner_id, устанавливаем дефолтные значения
UPDATE public.events
SET 
  owner_type = 'user'::owner_type,
  owner_id = organizer_id
WHERE owner_id IS NULL AND organizer_id IS NOT NULL;

-- Удаляем события без owner_id (если такие есть)
DELETE FROM public.events WHERE owner_id IS NULL;

-- Теперь можем установить NOT NULL
ALTER TABLE public.events
  ALTER COLUMN owner_type SET NOT NULL,
  ALTER COLUMN owner_id SET NOT NULL;

-- Для hubs, communities, projects: owner_id обязателен (если creator_id был обязателен)
-- Для projects creator_id был NOT NULL, поэтому owner_id тоже должен быть NOT NULL
ALTER TABLE public.projects
  ALTER COLUMN owner_id SET NOT NULL;

-- Для hubs и communities creator_id был nullable, поэтому owner_id тоже nullable
-- Но добавим DEFAULT для новых записей
ALTER TABLE public.hubs
  ALTER COLUMN owner_id SET DEFAULT NULL;

ALTER TABLE public.communities
  ALTER COLUMN owner_id SET DEFAULT NULL;

-- 6. CHECK constraint не нужен, так как enum owner_type уже не содержит 'event'
-- Валидация происходит на уровне enum

-- 7. Создать индексы для производительности
CREATE INDEX IF NOT EXISTS idx_events_owner ON public.events(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_hubs_owner_id ON public.hubs(owner_id);
CREATE INDEX IF NOT EXISTS idx_communities_owner_id ON public.communities(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);

-- 8. Обновить RLS политики для использования owner_id
-- Для events: обновить политику обновления
DROP POLICY IF EXISTS "Organizers can update their events" ON public.events;
CREATE POLICY "Owners can update their events"
  ON public.events FOR UPDATE
  USING (
    (owner_type = 'user' AND owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.hubs 
      WHERE id = events.owner_id 
      AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.communities 
      WHERE id = events.owner_id 
      AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = events.owner_id 
      AND owner_id = auth.uid()
    )
  );

-- Для hubs: обновить политику обновления
DROP POLICY IF EXISTS "Creators can update their hubs" ON public.hubs;
DROP POLICY IF EXISTS "Creators and moderators can update hubs" ON public.hubs;
CREATE POLICY "Owners and moderators can update hubs"
  ON public.hubs FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.hub_members
      WHERE hub_id = id
      AND user_id = auth.uid()
      AND role IN ('owner', 'moderator')
    )
  );

-- Для communities: обновить политику обновления
DROP POLICY IF EXISTS "Creators can update their communities" ON public.communities;
DROP POLICY IF EXISTS "Creators and moderators can update communities" ON public.communities;
CREATE POLICY "Owners and moderators can update communities"
  ON public.communities FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_id = id
      AND user_id = auth.uid()
      AND role IN ('owner', 'moderator')
    )
  );

-- Для projects: обновить политику обновления
DROP POLICY IF EXISTS "Creators can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Creators and moderators can update projects" ON public.projects;
CREATE POLICY "Owners and moderators can update projects"
  ON public.projects FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = id
      AND user_id = auth.uid()
      AND role IN ('owner', 'moderator')
    )
  );

-- 9. Обновить event_roles политики для использования owner
DROP POLICY IF EXISTS "Event organizers can manage event roles" ON public.event_roles;
CREATE POLICY "Event owners can manage event roles"
  ON public.event_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id
      AND (
        (owner_type = 'user' AND owner_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.hubs 
          WHERE id = events.owner_id 
          AND owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.communities 
          WHERE id = events.owner_id 
          AND owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.projects 
          WHERE id = events.owner_id 
          AND owner_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Event organizers can update event roles" ON public.event_roles;
CREATE POLICY "Event owners can update event roles"
  ON public.event_roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id
      AND (
        (owner_type = 'user' AND owner_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.hubs 
          WHERE id = events.owner_id 
          AND owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.communities 
          WHERE id = events.owner_id 
          AND owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.projects 
          WHERE id = events.owner_id 
          AND owner_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Event organizers can delete event roles" ON public.event_roles;
CREATE POLICY "Event owners can delete event roles"
  ON public.event_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id
      AND (
        (owner_type = 'user' AND owner_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.hubs 
          WHERE id = events.owner_id 
          AND owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.communities 
          WHERE id = events.owner_id 
          AND owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.projects 
          WHERE id = events.owner_id 
          AND owner_id = auth.uid()
        )
      )
    )
  );

-- Комментарии для документации
COMMENT ON COLUMN public.events.owner_type IS 'Тип владельца события: user, hub, community или project';
COMMENT ON COLUMN public.events.owner_id IS 'ID владельца события (пользователь или сущность)';
COMMENT ON COLUMN public.hubs.owner_id IS 'ID владельца хаба (пользователь)';
COMMENT ON COLUMN public.communities.owner_id IS 'ID владельца комьюнити (пользователь)';
COMMENT ON COLUMN public.projects.owner_id IS 'ID владельца проекта (пользователь)';

