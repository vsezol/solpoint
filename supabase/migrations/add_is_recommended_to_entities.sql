-- Migration: Add is_recommended field to hubs, communities, projects and workspaces tables
-- Добавляет поле для отметки рекомендованных сущностей
-- Date: 2024

-- Добавляем поле is_recommended в hubs (необязательное, по умолчанию false)
ALTER TABLE public.hubs
  ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false;

-- Создаем индекс для быстрой фильтрации рекомендованных hubs
CREATE INDEX IF NOT EXISTS idx_hubs_is_recommended ON public.hubs(is_recommended) WHERE is_recommended = true;

-- Комментарий для документации
COMMENT ON COLUMN public.hubs.is_recommended IS 'Флаг рекомендованного хаба. Рекомендованные хабы показываются в приоритете на странице хабов.';

-- Добавляем поле is_recommended в communities (необязательное, по умолчанию false)
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false;

-- Создаем индекс для быстрой фильтрации рекомендованных communities
CREATE INDEX IF NOT EXISTS idx_communities_is_recommended ON public.communities(is_recommended) WHERE is_recommended = true;

-- Комментарий для документации
COMMENT ON COLUMN public.communities.is_recommended IS 'Флаг рекомендованного комьюнити. Рекомендованные комьюнити показываются в приоритете на странице хабов.';

-- Добавляем поле is_recommended в projects (необязательное, по умолчанию false)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false;

-- Создаем индекс для быстрой фильтрации рекомендованных projects
CREATE INDEX IF NOT EXISTS idx_projects_is_recommended ON public.projects(is_recommended) WHERE is_recommended = true;

-- Комментарий для документации
COMMENT ON COLUMN public.projects.is_recommended IS 'Флаг рекомендованного проекта. Рекомендованные проекты показываются в приоритете на странице хабов.';

-- Добавляем поле is_recommended в workspaces (необязательное, по умолчанию false)
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false;

-- Создаем индекс для быстрой фильтрации рекомендованных workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_is_recommended ON public.workspaces(is_recommended) WHERE is_recommended = true;

-- Комментарий для документации
COMMENT ON COLUMN public.workspaces.is_recommended IS 'Флаг рекомендованного workspace. Рекомендованные workspaces показываются в приоритете на странице хабов.';

