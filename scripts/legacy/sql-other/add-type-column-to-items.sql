-- ============================================================================
-- ADD TYPE COLUMN TO ITEMS TABLE
-- Purpose: Add the type column if it doesn't exist
-- ============================================================================

-- Ensure item_type enum exists
DO $$ BEGIN
    CREATE TYPE item_type AS ENUM ('RAW_MATERIAL', 'COMPONENT', 'SUB_ASSEMBLY', 'FINISHED_GOODS', 'CONSUMABLE', 'TOOL', 'SERVICE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'items' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE items ADD COLUMN type item_type NOT NULL DEFAULT 'RAW_MATERIAL';
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
        
        RAISE NOTICE 'Added type column to items table';
    ELSE
        RAISE NOTICE 'Type column already exists in items table';
    END IF;
END $$;

-- Verify
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'items'
AND column_name = 'type';
