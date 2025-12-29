-- Migration: Drop personal messaging system completely
-- This migration removes all objects related to chats and messages
-- Date: 2024

-- Step 1: Drop all triggers first
DROP TRIGGER IF EXISTS validate_message_sender_trigger ON public.messages;
DROP TRIGGER IF EXISTS update_chat_last_message_trigger ON public.messages;
DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;
DROP TRIGGER IF EXISTS chats_updated_at ON public.chats;

-- Step 2: Drop all functions
DROP FUNCTION IF EXISTS public.validate_message_sender() CASCADE;
DROP FUNCTION IF EXISTS public.update_chat_last_message_at() CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_chat(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.mark_messages_as_read(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_unread_messages_count(UUID) CASCADE;

-- Step 3: Drop all RLS policies
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- Step 4: Drop all indexes (they will be dropped with tables, but being explicit)
DROP INDEX IF EXISTS public.idx_chats_user1_id;
DROP INDEX IF EXISTS public.idx_chats_user2_id;
DROP INDEX IF EXISTS public.idx_chats_last_message_at;
DROP INDEX IF EXISTS public.idx_chats_user_pair;
DROP INDEX IF EXISTS public.idx_messages_chat_id;
DROP INDEX IF EXISTS public.idx_messages_sender_id;
DROP INDEX IF EXISTS public.idx_messages_reply_to_id;
DROP INDEX IF EXISTS public.idx_messages_created_at;
DROP INDEX IF EXISTS public.idx_messages_chat_created;
DROP INDEX IF EXISTS public.idx_messages_is_read;

-- Step 5: Drop foreign key constraints explicitly (to avoid issues)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all foreign key constraints on messages table
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'messages'
          AND constraint_type = 'FOREIGN KEY'
    ) LOOP
        EXECUTE 'ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;
    
    -- Drop all foreign key constraints on chats table
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'chats'
          AND constraint_type = 'FOREIGN KEY'
    ) LOOP
        EXECUTE 'ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;
END $$;

-- Step 6: Drop tables (messages first due to foreign key dependency, then chats)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;

-- Step 7: Drop any remaining constraints or check constraints
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop check constraints on chats if any remain
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'chats'
          AND constraint_type = 'CHECK'
    ) LOOP
        EXECUTE 'ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;
    
    -- Drop check constraints on messages if any remain
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'messages'
          AND constraint_type = 'CHECK'
    ) LOOP
        EXECUTE 'ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;
END $$;

