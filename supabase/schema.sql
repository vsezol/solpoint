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

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  twitter_id TEXT UNIQUE NOT NULL,
  twitter_handle TEXT NOT NULL,
  twitter_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT CHECK (char_length(bio) <= 150),
  country TEXT NOT NULL,
  city TEXT,
  role user_role DEFAULT 'degen',
  is_open_to_meet BOOLEAN DEFAULT false,
  subscription_tier subscription_tier DEFAULT 'free',
  is_verified BOOLEAN DEFAULT false,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hubs table
CREATE TABLE public.hubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  country TEXT NOT NULL,
  city TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  members_count INTEGER DEFAULT 0,
  socials JSONB DEFAULT '{}',
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

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE INDEX idx_events_country ON public.events(country);
CREATE INDEX idx_events_city ON public.events(city);
CREATE INDEX idx_events_start_date ON public.events(start_date);
CREATE INDEX idx_events_visibility ON public.events(visibility);

CREATE INDEX idx_hubs_country ON public.hubs(country);

CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_members ENABLE ROW LEVEL SECURITY;

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

-- Messages policies (VIP only)
CREATE POLICY "Users can view their own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "VIP users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND subscription_tier = 'vip'
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

