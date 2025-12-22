-- Migration: Add entity_submissions table for moderation system
-- Description: Universal moderation system for events, hubs, communities, projects, and workspaces
-- Date: 2024
-- Note: 'workspace' was added later in migration add_workspace_to_entity_type.sql

-- Enum для типов сущностей
CREATE TYPE entity_type AS ENUM ('event', 'hub', 'community', 'project');

-- Enum для статусов модерации
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');

-- Универсальная таблица заявок на создание сущностей
CREATE TABLE public.entity_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Тип сущности
  entity_type entity_type NOT NULL,
  
  -- Автор заявки
  submitter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Все данные сущности в JSONB (гибкая структура)
  -- Для event: { name, description, image_url, country, city, address, latitude, longitude, 
  --              start_date, end_date, event_type, visibility, is_paid, price_sol, max_attendees,
  --              socials, contacts, hub_id, community_id, project_id, ... }
  -- Для hub/community/project: { name, description, image_url, country, city, latitude, longitude,
  --                              socials, contacts, ... }
  entity_data JSONB NOT NULL,
  
  -- Контакты для связи (обязательно для не-админов)
  -- { email?: string, telegram?: string, phone?: string }
  contacts JSONB NOT NULL DEFAULT '{}',
  
  -- Статус модерации
  status submission_status DEFAULT 'pending',
  
  -- Модерация
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Админ, который проверил
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT, -- Причина отклонения (если rejected)
  admin_notes TEXT, -- Внутренние заметки админа
  
  -- Связь с созданной сущностью (если одобрено)
  -- Полиморфная связь через JSONB
  approved_entity_id UUID, -- ID созданной сущности
  approved_entity_type entity_type, -- Тип созданной сущности (для валидации)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX idx_entity_submissions_entity_type ON public.entity_submissions(entity_type);
CREATE INDEX idx_entity_submissions_status ON public.entity_submissions(status);
CREATE INDEX idx_entity_submissions_submitter_id ON public.entity_submissions(submitter_id);
CREATE INDEX idx_entity_submissions_reviewed_by ON public.entity_submissions(reviewed_by);
CREATE INDEX idx_entity_submissions_created_at ON public.entity_submissions(created_at DESC);

-- Составной индекс для админки (часто используемый запрос)
CREATE INDEX idx_entity_submissions_type_status ON public.entity_submissions(entity_type, status, created_at DESC);

-- Индекс для поиска по JSONB полям (индексируем весь entity_data для быстрого поиска)
CREATE INDEX idx_entity_submissions_entity_data ON public.entity_submissions USING GIN (entity_data);

-- Row Level Security (RLS)
ALTER TABLE public.entity_submissions ENABLE ROW LEVEL SECURITY;

-- Policies для entity_submissions
-- Пользователи могут видеть только свои заявки
CREATE POLICY "Users can view their own submissions"
  ON public.entity_submissions FOR SELECT
  USING (submitter_id = auth.uid());

-- Админы могут видеть все заявки
CREATE POLICY "Admins can view all submissions"
  ON public.entity_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

-- Пользователи могут создавать свои заявки
CREATE POLICY "Users can create their own submissions"
  ON public.entity_submissions FOR INSERT
  WITH CHECK (auth.uid() = submitter_id);

-- Админы могут обновлять заявки (одобрять/отклонять)
CREATE POLICY "Admins can update submissions"
  ON public.entity_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

-- Пользователи могут обновлять только свои pending заявки (например, отменить)
CREATE POLICY "Users can update their own pending submissions"
  ON public.entity_submissions FOR UPDATE
  USING (
    submitter_id = auth.uid() 
    AND status = 'pending'
  )
  WITH CHECK (
    submitter_id = auth.uid() 
    AND status = 'pending'
  );

-- Trigger для обновления updated_at
CREATE TRIGGER entity_submissions_updated_at
BEFORE UPDATE ON public.entity_submissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

