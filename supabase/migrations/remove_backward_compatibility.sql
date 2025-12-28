-- Migration: Remove backward compatibility fields
-- Удаляет старые поля creator_id и organizer_id после миграции на owner_id

-- ВАЖНО: Сначала обновляем все RLS политики, которые используют старые поля,
-- затем удаляем колонки. Иначе получим ошибку о зависимостях.

-- 1. Обновить RLS политики, убрав ссылки на старые поля
-- Политики для hubs
DROP POLICY IF EXISTS "Owners and moderators can update hubs" ON public.hubs;
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

-- Политики для communities
DROP POLICY IF EXISTS "Owners and moderators can update communities" ON public.communities;
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

-- Политики для projects
DROP POLICY IF EXISTS "Owners and moderators can update projects" ON public.projects;
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

-- Политики для events (удаляем старые, которые используют organizer_id)
DROP POLICY IF EXISTS "Organizers can update their events" ON public.events;
DROP POLICY IF EXISTS "Event organizers can update event roles" ON public.event_roles;
DROP POLICY IF EXISTS "Event organizers can delete event roles" ON public.event_roles;
DROP POLICY IF EXISTS "Event owners can insert event roles" ON public.event_roles;
DROP POLICY IF EXISTS "Event owners can update event roles" ON public.event_roles;
DROP POLICY IF EXISTS "Event owners can delete event roles" ON public.event_roles;

-- Пересоздаем политики для events без organizer_id
CREATE POLICY "Event owners can insert event roles"
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
        OR EXISTS (
          SELECT 1 FROM public.workspaces 
          WHERE id = events.owner_id 
          AND owner_id = auth.uid()
        )
      )
    )
  );

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
        OR EXISTS (
          SELECT 1 FROM public.workspaces 
          WHERE id = events.owner_id 
          AND owner_id = auth.uid()
        )
      )
    )
  );

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
        OR EXISTS (
          SELECT 1 FROM public.workspaces 
          WHERE id = events.owner_id 
          AND owner_id = auth.uid()
        )
      )
    )
  );

-- Удаляем старые политики, которые могут использовать creator_id
DROP POLICY IF EXISTS "Creators can update their hubs" ON public.hubs;
DROP POLICY IF EXISTS "Creators can update their communities" ON public.communities;
DROP POLICY IF EXISTS "Creators can update their projects" ON public.projects;

-- 2. Удалить колонки creator_id из hubs, communities, projects
ALTER TABLE public.hubs
  DROP COLUMN IF EXISTS creator_id CASCADE;

ALTER TABLE public.communities
  DROP COLUMN IF EXISTS creator_id CASCADE;

ALTER TABLE public.projects
  DROP COLUMN IF EXISTS creator_id CASCADE;

-- 3. Удалить колонки organizer_id, hub_id, community_id, project_id из events
-- (оставляем только owner_type и owner_id)
ALTER TABLE public.events
  DROP COLUMN IF EXISTS organizer_id CASCADE,
  DROP COLUMN IF EXISTS hub_id CASCADE,
  DROP COLUMN IF EXISTS community_id CASCADE,
  DROP COLUMN IF EXISTS project_id CASCADE;

-- 4. Удалить индексы для старых полей
DROP INDEX IF EXISTS idx_communities_creator_id;
DROP INDEX IF EXISTS idx_projects_creator_id;
DROP INDEX IF EXISTS idx_events_hub_id;
DROP INDEX IF EXISTS idx_events_community_id;
DROP INDEX IF EXISTS idx_events_project_id;
DROP INDEX IF EXISTS idx_hubs_creator_id;

-- Комментарий
COMMENT ON COLUMN public.events.owner_id IS 'ID владельца события (пользователь или сущность). Используйте owner_type для определения типа.';
COMMENT ON COLUMN public.hubs.owner_id IS 'ID владельца хаба (пользователь)';
COMMENT ON COLUMN public.communities.owner_id IS 'ID владельца комьюнити (пользователь)';
COMMENT ON COLUMN public.projects.owner_id IS 'ID владельца проекта (пользователь)';

