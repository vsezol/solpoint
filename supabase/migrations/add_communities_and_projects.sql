-- Migration: Add communities and projects tables
-- Description: Creates tables for communities and projects, along with their member relationships
-- Date: 2024

-- Communities table
-- Комьюнити: нет места в конкретной стране, существуют по всему миру, в основном общение в чатах
CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  slug TEXT UNIQUE, -- Публичная ссылка для SEO
  country TEXT NOT NULL, -- Страна для размещения на карте
  city TEXT, -- Опционально, если есть локация
  latitude DOUBLE PRECISION NOT NULL, -- Координаты для размещения на карте (не точные)
  longitude DOUBLE PRECISION NOT NULL,
  members_count INTEGER DEFAULT 0,
  socials JSONB DEFAULT '{}',
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
-- Проекты: стартапы или продукты, создавать может только юзер
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  slug TEXT UNIQUE, -- Публичная ссылка для SEO
  country TEXT NOT NULL, -- Страна для размещения на карте
  city TEXT, -- Опционально, если есть локация
  latitude DOUBLE PRECISION NOT NULL, -- Координаты для размещения на карте (не точные)
  longitude DOUBLE PRECISION NOT NULL,
  members_count INTEGER DEFAULT 0,
  socials JSONB DEFAULT '{}',
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Проект должен иметь создателя
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community members (many-to-many)
CREATE TABLE public.community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Project members (many-to-many)
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Add community_id and project_id to events table
-- Для создания ивентов от имени комьюнити или проекта
-- Примечание: hub_id уже должен существовать в events (добавлен в предыдущих миграциях)
-- Только пользователи могут создавать хабы, проекты и комьюнити (через creator_id)
-- От имени хабов, проектов и комьюнити можно создавать только ивенты (через hub_id, project_id, community_id)
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_communities_country ON public.communities(country);
CREATE INDEX idx_communities_creator_id ON public.communities(creator_id);
CREATE INDEX idx_communities_slug ON public.communities(slug);

CREATE INDEX idx_projects_country ON public.projects(country);
CREATE INDEX idx_projects_creator_id ON public.projects(creator_id);
CREATE INDEX idx_projects_slug ON public.projects(slug);

CREATE INDEX idx_community_members_community_id ON public.community_members(community_id);
CREATE INDEX idx_community_members_user_id ON public.community_members(user_id);

CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_user_id ON public.project_members(user_id);

CREATE INDEX idx_events_community_id ON public.events(community_id);
CREATE INDEX idx_events_project_id ON public.events(project_id);

-- Row Level Security (RLS)
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Communities policies
CREATE POLICY "Communities are viewable by everyone"
  ON public.communities FOR SELECT
  USING (true);

CREATE POLICY "Creators can update their communities"
  ON public.communities FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "Authenticated users can create communities"
  ON public.communities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Projects policies
CREATE POLICY "Projects are viewable by everyone"
  ON public.projects FOR SELECT
  USING (true);

CREATE POLICY "Creators can update their projects"
  ON public.projects FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Community members policies
CREATE POLICY "Community members are viewable by authenticated users"
  ON public.community_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can join communities"
  ON public.community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities"
  ON public.community_members FOR DELETE
  USING (auth.uid() = user_id);

-- Project members policies
CREATE POLICY "Project members are viewable by authenticated users"
  ON public.project_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can join projects"
  ON public.project_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave projects"
  ON public.project_members FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updating members count
CREATE OR REPLACE FUNCTION update_community_members_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities 
    SET members_count = members_count + 1 
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities 
    SET members_count = members_count - 1 
    WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER community_members_count_trigger
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION update_community_members_count();

CREATE OR REPLACE FUNCTION update_project_members_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects 
    SET members_count = members_count + 1 
    WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects 
    SET members_count = members_count - 1 
    WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_members_count_trigger
AFTER INSERT OR DELETE ON public.project_members
FOR EACH ROW EXECUTE FUNCTION update_project_members_count();

-- Trigger for updating updated_at
CREATE TRIGGER communities_updated_at
BEFORE UPDATE ON public.communities
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

