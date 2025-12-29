-- Migration: Personal messaging system with chats and messages
-- Creates tables: chats, messages (replaces old messages table)
-- Date: 2024

-- Step 0: Ensure update_updated_at function exists (used by triggers)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 1: Drop old messages table if it exists (we'll replace it with new structure)
DROP TABLE IF EXISTS public.messages CASCADE;

-- Step 2: Create chats table (chat between two users)
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure user1_id < user2_id for consistency (avoid duplicate chats)
  CHECK (user1_id < user2_id),
  -- Unique constraint: only one chat per pair of users
  UNIQUE(user1_id, user2_id)
);

-- Step 3: Create messages table (messages in a chat)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 5000),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes for performance
CREATE INDEX idx_chats_user1_id ON public.chats(user1_id);
CREATE INDEX idx_chats_user2_id ON public.chats(user2_id);
CREATE INDEX idx_chats_last_message_at ON public.chats(last_message_at DESC NULLS LAST);
CREATE INDEX idx_chats_user_pair ON public.chats(user1_id, user2_id);

CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_chat_created ON public.messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_is_read ON public.messages(is_read) WHERE is_read = false;

-- Step 5: Create function to get or create chat between two users
-- This function ensures we always use the correct order (user1_id < user2_id)
CREATE OR REPLACE FUNCTION public.get_or_create_chat(
  p_user1_id UUID,
  p_user2_id UUID
) RETURNS UUID AS $$
DECLARE
  v_chat_id UUID;
  v_smaller_id UUID;
  v_larger_id UUID;
BEGIN
  -- Ensure user1_id < user2_id
  IF p_user1_id < p_user2_id THEN
    v_smaller_id := p_user1_id;
    v_larger_id := p_user2_id;
  ELSE
    v_smaller_id := p_user2_id;
    v_larger_id := p_user1_id;
  END IF;
  
  -- Try to find existing chat
  SELECT id INTO v_chat_id
  FROM public.chats
  WHERE user1_id = v_smaller_id AND user2_id = v_larger_id;
  
  -- If chat doesn't exist, create it
  IF v_chat_id IS NULL THEN
    INSERT INTO public.chats (user1_id, user2_id)
    VALUES (v_smaller_id, v_larger_id)
    RETURNING id INTO v_chat_id;
  END IF;
  
  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to validate sender is part of chat
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

-- Step 7: Create trigger to update last_message_at in chats when message is created
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

-- Step 8: Create trigger for updating updated_at
CREATE TRIGGER chats_updated_at
BEFORE UPDATE ON public.chats
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Step 9: Enable Row Level Security
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Step 10: RLS policies for chats
-- Users can view chats they are part of
CREATE POLICY "Users can view their own chats"
  ON public.chats FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can create chats (through get_or_create_chat function)
CREATE POLICY "Users can create chats"
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can update their own chats (for last_message_at, etc.)
CREATE POLICY "Users can update their own chats"
  ON public.chats FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Step 11: RLS policies for messages
-- Users can view messages in chats they are part of
CREATE POLICY "Users can view messages in their chats"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE id = messages.chat_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- Users can send messages in chats they are part of
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

-- Users can update their own messages (for editing, marking as read, etc.)
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

-- Users can delete their own messages
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

-- Step 12: Create helper function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
  p_chat_id UUID,
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Verify user is part of the chat
  IF NOT EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = p_chat_id
    AND (user1_id = p_user_id OR user2_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'User is not part of this chat';
  END IF;
  
  -- Mark all messages in chat as read (except those sent by the user)
  UPDATE public.messages
  SET is_read = true,
      updated_at = NOW()
  WHERE chat_id = p_chat_id
    AND sender_id != p_user_id
    AND is_read = false;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Create function to get unread messages count for a user
CREATE OR REPLACE FUNCTION public.get_unread_messages_count(
  p_user_id UUID
) RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.messages m
    INNER JOIN public.chats c ON m.chat_id = c.id
    WHERE (c.user1_id = p_user_id OR c.user2_id = p_user_id)
      AND m.sender_id != p_user_id
      AND m.is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Add comments for documentation
COMMENT ON TABLE public.chats IS 'Chats between two users (personal messages)';
COMMENT ON TABLE public.messages IS 'Messages in chats';
COMMENT ON COLUMN public.chats.user1_id IS 'First user ID (always smaller than user2_id)';
COMMENT ON COLUMN public.chats.user2_id IS 'Second user ID (always larger than user1_id)';
COMMENT ON COLUMN public.chats.last_message_at IS 'Timestamp of the last message in the chat';
COMMENT ON FUNCTION public.get_or_create_chat IS 'Get existing chat or create new one between two users';
COMMENT ON FUNCTION public.mark_messages_as_read IS 'Mark all unread messages in a chat as read for a user';
COMMENT ON FUNCTION public.get_unread_messages_count IS 'Get total count of unread messages for a user';

