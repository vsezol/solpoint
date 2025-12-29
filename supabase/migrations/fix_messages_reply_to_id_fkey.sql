-- Migration: Fix messages_reply_to_id_fkey foreign key constraint
-- This migration ensures the foreign key has the correct name for PostgREST

-- Step 1: Drop existing foreign key constraint if it exists (with any name)
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
        EXECUTE 'ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
    
    -- Also explicitly drop the constraint with the expected name if it exists
    EXECUTE 'ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_reply_to_id_fkey';
END $$;

-- Step 2: Add the foreign key constraint with the correct name
-- Only add if the column exists and doesn't already have the constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'reply_to_id'
    ) THEN
        -- Check if constraint already exists
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND constraint_name = 'messages_reply_to_id_fkey'
        ) THEN
            EXECUTE 'ALTER TABLE public.messages ADD CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id) ON DELETE SET NULL';
        END IF;
    END IF;
END $$;

