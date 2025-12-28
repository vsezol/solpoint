-- Migration: Add 'workspace' to entity_type enum
-- Description: Adds workspace support to entity_submissions table
-- Date: 2024

-- Добавляем 'workspace' в enum entity_type
-- В PostgreSQL нельзя добавить значение в enum, если есть транзакции, использующие этот enum
-- Поэтому используем IF NOT EXISTS проверку через DO блок
DO $$ 
BEGIN
    -- Проверяем, существует ли уже значение 'workspace' в enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'workspace' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'entity_type')
    ) THEN
        -- Добавляем новое значение в enum
        ALTER TYPE entity_type ADD VALUE 'workspace';
    END IF;
END $$;

-- Комментарий для документации
COMMENT ON TYPE entity_type IS 'Types of entities that can be submitted for moderation: event, hub, community, project, workspace';

