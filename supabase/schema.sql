-- SolPoint Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE user_role AS ENUM ('degen', 'developer', 'trader', 'investor', 'designer', 'founder', 'other');

-- Subscription tier enum
CREATE TYPE subscription_tier AS ENUM ('free', 'vip');

-- Event type enum
CREATE TYPE event_type AS ENUM ('official', 'community', 'private', 'meetup');

-- Event visibility enum
CREATE TYPE event_visibility AS ENUM ('public', 'vip_only');

-- Entity type enum (for submissions)
CREATE TYPE entity_type AS ENUM ('event', 'hub', 'community', 'project', 'workspace');

-- Submission status enum
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  twitter_id TEXT UNIQUE NOT NULL,
  twitter_handle TEXT NOT NULL,
  twitter_name TEXT NOT NULL,
  avatar_url TEXT,
  banner_url TEXT, -- URL баннера профиля из Supabase Storage (bucket: profile-banners)
  bio TEXT CHECK (char_length(bio) <= 150),
  country TEXT,
  country_code CHAR(2),
  city TEXT,
  role user_role DEFAULT 'degen',
  is_open_to_meet BOOLEAN DEFAULT false,
  subscription_tier subscription_tier DEFAULT 'free',
  is_verified BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false NOT NULL,
  wallet_address TEXT,
  socials JSONB DEFAULT '{}',
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  event_type event_type NOT NULL DEFAULT 'community',
  visibility event_visibility NOT NULL DEFAULT 'public',
  is_paid BOOLEAN DEFAULT false,
  price_sol DECIMAL(10, 4),
  max_attendees INTEGER,
  attendees_count INTEGER DEFAULT 0,
  socials JSONB DEFAULT '{}',
  organizer_id UUID REFERENCES public.profiles(id),
  hub_id UUID REFERENCES public.hubs(id) ON DELETE SET NULL,
  community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hubs table
CREATE TABLE public.hubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  slug TEXT UNIQUE, -- Публичная ссылка для SEO
  country TEXT NOT NULL,
  city TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  members_count INTEGER DEFAULT 0,
  socials JSONB DEFAULT '{}',
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Event attendees (many-to-many)
CREATE TABLE public.event_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Hub members (many-to-many)
CREATE TABLE public.hub_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hub_id UUID NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hub_id, user_id)
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

-- Entity submissions table (universal moderation system)
CREATE TABLE public.entity_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type entity_type NOT NULL,
  submitter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_data JSONB NOT NULL,
  contacts JSONB NOT NULL DEFAULT '{}',
  status submission_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT,
  approved_entity_id UUID,
  approved_entity_type entity_type,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chats table (personal messages between two users)
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user1_id < user2_id),
  UNIQUE(user1_id, user2_id)
);

-- Messages table (messages in chats with reply support)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 5000),
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to validate sender is part of chat (used in trigger)
CREATE OR REPLACE FUNCTION validate_message_sender()
RETURNS TRIGGER AS $$
BEGIN
  -- Verify sender is one of the chat participants
  IF NOT EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = NEW.chat_id
    AND (user1_id = NEW.sender_id OR user2_id = NEW.sender_id)
  ) THEN
    RAISE EXCEPTION 'Sender must be a participant in the chat';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_message_sender_trigger
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION validate_message_sender();

-- Friends / Mutual follows table
CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Subscriptions table (for VIP payments)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  tx_signature TEXT, -- Solana transaction signature
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Country statistics view
CREATE VIEW public.country_stats AS
SELECT 
  country,
  COUNT(DISTINCT id) as users_count,
  COUNT(DISTINCT CASE WHEN subscription_tier = 'vip' THEN id END) as vip_users_count
FROM public.profiles
GROUP BY country;

-- Indexes for performance
CREATE INDEX idx_profiles_country ON public.profiles(country);
CREATE INDEX idx_profiles_city ON public.profiles(city);
CREATE INDEX idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX idx_profiles_last_active ON public.profiles(last_active_at);
CREATE INDEX idx_profiles_twitter_id ON public.profiles(twitter_id);
CREATE INDEX idx_profiles_twitter_handle ON public.profiles(twitter_handle);
CREATE INDEX idx_profiles_is_admin ON public.profiles(is_admin);

CREATE INDEX idx_events_country ON public.events(country);
CREATE INDEX idx_events_city ON public.events(city);
CREATE INDEX idx_events_start_date ON public.events(start_date);
CREATE INDEX idx_events_visibility ON public.events(visibility);

CREATE INDEX idx_hubs_country ON public.hubs(country);
CREATE INDEX idx_hubs_slug ON public.hubs(slug);

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

CREATE INDEX idx_entity_submissions_entity_type ON public.entity_submissions(entity_type);
CREATE INDEX idx_entity_submissions_status ON public.entity_submissions(status);
CREATE INDEX idx_entity_submissions_submitter_id ON public.entity_submissions(submitter_id);
CREATE INDEX idx_entity_submissions_reviewed_by ON public.entity_submissions(reviewed_by);
CREATE INDEX idx_entity_submissions_created_at ON public.entity_submissions(created_at DESC);
CREATE INDEX idx_entity_submissions_type_status ON public.entity_submissions(entity_type, status, created_at DESC);

CREATE INDEX idx_events_hub_id ON public.events(hub_id);
CREATE INDEX idx_events_community_id ON public.events(community_id);
CREATE INDEX idx_events_project_id ON public.events(project_id);

CREATE INDEX idx_chats_user1_id ON public.chats(user1_id);
CREATE INDEX idx_chats_user2_id ON public.chats(user2_id);
CREATE INDEX idx_chats_last_message_at ON public.chats(last_message_at DESC NULLS LAST);
CREATE INDEX idx_chats_user_pair ON public.chats(user1_id, user2_id);

CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_reply_to_id ON public.messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_chat_created ON public.messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_is_read ON public.messages(is_read) WHERE is_read = false;

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_submissions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Events policies
CREATE POLICY "Public events are viewable by everyone"
  ON public.events FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "VIP events viewable by VIP users"
  ON public.events FOR SELECT
  USING (
    visibility = 'vip_only' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND subscription_tier = 'vip'
    )
  );

CREATE POLICY "Organizers can update their events"
  ON public.events FOR UPDATE
  USING (organizer_id = auth.uid());

CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Hubs policies
CREATE POLICY "Hubs are viewable by everyone"
  ON public.hubs FOR SELECT
  USING (true);

CREATE POLICY "Creators can update their hubs"
  ON public.hubs FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "Authenticated users can create hubs"
  ON public.hubs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Chats policies
CREATE POLICY "Users can view their own chats"
  ON public.chats FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create chats"
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their own chats"
  ON public.chats FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages policies
CREATE POLICY "Users can view messages in their chats"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE id = messages.chat_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their chats"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chats
      WHERE id = chat_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update messages in their chats"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE id = messages.chat_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE id = messages.chat_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chats
      WHERE id = messages.chat_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- Friends policies
CREATE POLICY "Users can view their friends"
  ON public.friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Authenticated users can add friends"
  ON public.friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friend requests"
  ON public.friends FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Event attendees policies
CREATE POLICY "Attendees are viewable by authenticated users"
  ON public.event_attendees FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can register for events"
  ON public.event_attendees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unregister from events"
  ON public.event_attendees FOR DELETE
  USING (auth.uid() = user_id);

-- Hub members policies
CREATE POLICY "Hub members are viewable by authenticated users"
  ON public.hub_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can join hubs"
  ON public.hub_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave hubs"
  ON public.hub_members FOR DELETE
  USING (auth.uid() = user_id);

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

-- Entity submissions policies
CREATE POLICY "Users can view their own submissions"
  ON public.entity_submissions FOR SELECT
  USING (submitter_id = auth.uid());

CREATE POLICY "Admins can view all submissions"
  ON public.entity_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

CREATE POLICY "Users can create their own submissions"
  ON public.entity_submissions FOR INSERT
  WITH CHECK (auth.uid() = submitter_id);

CREATE POLICY "Admins can update submissions"
  ON public.entity_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

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

-- Triggers for updating counts
CREATE OR REPLACE FUNCTION update_event_attendees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.events 
    SET attendees_count = attendees_count + 1 
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.events 
    SET attendees_count = attendees_count - 1 
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_attendees_count_trigger
AFTER INSERT OR DELETE ON public.event_attendees
FOR EACH ROW EXECUTE FUNCTION update_event_attendees_count();

CREATE OR REPLACE FUNCTION update_hub_members_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.hubs 
    SET members_count = members_count + 1 
    WHERE id = NEW.hub_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.hubs 
    SET members_count = members_count - 1 
    WHERE id = OLD.hub_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hub_members_count_trigger
AFTER INSERT OR DELETE ON public.hub_members
FOR EACH ROW EXECUTE FUNCTION update_hub_members_count();

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
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER hubs_updated_at
BEFORE UPDATE ON public.hubs
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER communities_updated_at
BEFORE UPDATE ON public.communities
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER entity_submissions_updated_at
BEFORE UPDATE ON public.entity_submissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER chats_updated_at
BEFORE UPDATE ON public.chats
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger to update last_message_at in chats when message is created
CREATE OR REPLACE FUNCTION update_chat_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chats
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_last_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION update_chat_last_message_at();

