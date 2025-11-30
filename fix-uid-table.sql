-- Check if status column exists and add it if missing
DO $$ 
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'uid_registry' 
        AND column_name = 'status'
    ) THEN
        -- Create enum type if it doesn't exist
        CREATE TYPE IF NOT EXISTS uid_status AS ENUM ('ACTIVE', 'CONSUMED', 'SOLD', 'SCRAPPED', 'RETURNED', 'UNDER_SERVICE');
        
        -- Add status column
        ALTER TABLE uid_registry 
        ADD COLUMN status uid_status DEFAULT 'ACTIVE';
        
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
