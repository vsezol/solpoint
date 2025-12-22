-- Migration: Remove backward compatibility fields
-- Удаляет старые поля creator_id и organizer_id после миграции на owner_id

-- 1. Удалить колонки creator_id из hubs, communities, projects
ALTER TABLE public.hubs
  DROP COLUMN IF EXISTS creator_id;

ALTER TABLE public.communities
  DROP COLUMN IF EXISTS creator_id;

ALTER TABLE public.projects
  DROP COLUMN IF EXISTS creator_id;

-- 2. Удалить колонки organizer_id, hub_id, community_id, project_id из events
-- (оставляем только owner_type и owner_id)
ALTER TABLE public.events
  DROP COLUMN IF EXISTS organizer_id,
  DROP COLUMN IF EXISTS hub_id,
  DROP COLUMN IF EXISTS community_id,
  DROP COLUMN IF EXISTS project_id;

-- 3. Удалить индексы для старых полей
DROP INDEX IF EXISTS idx_communities_creator_id;
DROP INDEX IF EXISTS idx_projects_creator_id;
DROP INDEX IF EXISTS idx_events_hub_id;
DROP INDEX IF EXISTS idx_events_community_id;
DROP INDEX IF EXISTS idx_events_project_id;

-- 4. Обновить RLS политики, убрав ссылки на старые поля
-- Политики уже обновлены в add_owner_fields.sql, но убедимся что нет старых
DROP POLICY IF EXISTS "Organizers can update their events" ON public.events;
DROP POLICY IF EXISTS "Creators can update their hubs" ON public.hubs;
DROP POLICY IF EXISTS "Creators can update their communities" ON public.communities;
DROP POLICY IF EXISTS "Creators can update their projects" ON public.projects;

-- Комментарий
COMMENT ON COLUMN public.events.owner_id IS 'ID владельца события (пользователь или сущность). Используйте owner_type для определения типа.';
COMMENT ON COLUMN public.hubs.owner_id IS 'ID владельца хаба (пользователь)';
COMMENT ON COLUMN public.communities.owner_id IS 'ID владельца комьюнити (пользователь)';
COMMENT ON COLUMN public.projects.owner_id IS 'ID владельца проекта (пользователь)';

