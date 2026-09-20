-- First check what enum values exist
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'uid_status');

-- Add status column with correct enum value
DO $$ 
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'uid_registry' 
        AND column_name = 'status'
    ) THEN
        -- Add status column with first available enum value
        ALTER TABLE uid_registry 
        ADD COLUMN status uid_status DEFAULT 'GENERATED';
        
        RAISE NOTICE 'Added status column to uid_registry table';
    ELSE
        RAISE NOTICE 'Status column already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'uid_registry'
ORDER BY ordinal_position;
