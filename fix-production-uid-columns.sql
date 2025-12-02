-- Add columns to uid_registry for production tracking
-- These columns track when a component UID is consumed in production

-- Add consumed_at timestamp
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='uid_registry' AND column_name='consumed_at'
    ) THEN
        ALTER TABLE uid_registry ADD COLUMN consumed_at TIMESTAMP;
        RAISE NOTICE 'Added consumed_at column to uid_registry';
    END IF;
END $$;

-- Add consumed_in_uid to track which finished product this component went into
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='uid_registry' AND column_name='consumed_in_uid'
    ) THEN
        ALTER TABLE uid_registry ADD COLUMN consumed_in_uid VARCHAR(100);
        RAISE NOTICE 'Added consumed_in_uid column to uid_registry';
    END IF;
END $$;

-- Create index for consumed UIDs
CREATE INDEX IF NOT EXISTS idx_uid_registry_consumed_in ON uid_registry(consumed_in_uid);

-- Update status enum to include CONSUMED if not present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONSUMED' AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'uid_status'
    )) THEN
        ALTER TYPE uid_status ADD VALUE 'CONSUMED';
        RAISE NOTICE 'Added CONSUMED status to uid_status enum';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'CONSUMED status already exists in uid_status enum';
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Production UID tracking columns added successfully';
    RAISE NOTICE 'Component UIDs will now be properly tracked when consumed in production';
END $$;
