-- Migration: Create workspaces table
-- Workspaces похожи на hubs, но с обязательным адресом
-- Используют ту же систему owner и модерации

-- 1. Создать таблицу workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  slug TEXT UNIQUE, -- Публичная ссылка для SEO
  country TEXT NOT NULL, -- Страна обязательна
  city TEXT, -- Город опционален
  address TEXT NOT NULL, -- Адрес обязателен для workspaces
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  members_count INTEGER DEFAULT 0,
  socials JSONB DEFAULT '{}',
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Создать таблицу workspace_members (аналогично hub_members)
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- 3. Создать индексы
CREATE INDEX IF NOT EXISTS idx_workspaces_country ON public.workspaces(country);
CREATE INDEX IF NOT EXISTS idx_workspaces_city ON public.workspaces(city);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON public.workspace_members(role);

-- 4. Триггер для обновления members_count
CREATE OR REPLACE FUNCTION update_workspace_members_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.workspaces 
    SET members_count = members_count + 1 
    WHERE id = NEW.workspace_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.workspaces 
    SET members_count = members_count - 1 
    WHERE id = OLD.workspace_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_members_count_trigger
AFTER INSERT OR DELETE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION update_workspace_members_count();

-- 5. Триггер для обновления updated_at
CREATE TRIGGER workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Включить RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 7. RLS политики для workspaces
CREATE POLICY "Workspaces are viewable by everyone"
  ON public.workspaces FOR SELECT
  USING (true);

CREATE POLICY "Owners and moderators can update workspaces"
  ON public.workspaces FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = id
      AND user_id = auth.uid()
      AND role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 8. RLS политики для workspace_members
CREATE POLICY "Workspace members are viewable by authenticated users"
  ON public.workspace_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can join workspaces"
  ON public.workspace_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave workspaces"
  ON public.workspace_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Workspace owners and moderators can remove members"
  ON public.workspace_members FOR DELETE
  USING (
    auth.uid() != user_id
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'moderator')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.workspace_members wm2
      WHERE wm2.workspace_id = workspace_members.workspace_id
      AND wm2.user_id = workspace_members.user_id
      AND wm2.role = 'owner'
    )
  );

CREATE POLICY "Workspace owners can update member roles"
  ON public.workspace_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.workspaces w ON w.id = wm.workspace_id
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'owner'
    )
  );

-- 9. Обновить entity_type enum для включения workspace
-- Сначала проверим, существует ли значение
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'workspace' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'entity_type')
    ) THEN
        ALTER TYPE entity_type ADD VALUE 'workspace';
    END IF;
END $$;

-- 10. Обновить owner_type enum для включения workspace (если нужно для events)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'workspace' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'owner_type')
    ) THEN
        ALTER TYPE owner_type ADD VALUE 'workspace';
    END IF;
END $$;

-- Комментарии
COMMENT ON TABLE public.workspaces IS 'Коворкинги - похожи на hubs, но с обязательным адресом';
COMMENT ON COLUMN public.workspaces.address IS 'Адрес обязателен для workspaces';
COMMENT ON COLUMN public.workspaces.owner_id IS 'ID владельца workspace (пользователь)';

