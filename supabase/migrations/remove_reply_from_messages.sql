-- Migration: Remove reply functionality from messages table
-- This migration removes reply_to_id column and all related constraints/indexes
-- Date: 2024

-- Step 1: Drop foreign key constraint for reply_to_id
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find and drop any existing foreign key constraint on reply_to_id column
    FOR r IN (
        SELECT 
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'messages'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'reply_to_id'
    ) LOOP
        EXECUTE 'ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;
    
    -- Also explicitly drop the constraint with the expected name if it exists
    ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_reply_to_id_fkey CASCADE;
END $$;

-- Step 2: Drop index for reply_to_id
DROP INDEX IF EXISTS public.idx_messages_reply_to_id;

-- Step 3: Drop comment on reply_to_id column if it exists
COMMENT ON COLUMN public.messages.reply_to_id IS NULL;

-- Step 4: Drop the reply_to_id column
ALTER TABLE public.messages DROP COLUMN IF EXISTS reply_to_id CASCADE;

-- Step 5: Update table comment to remove mention of reply support
COMMENT ON TABLE public.messages IS 'Messages in chats';

