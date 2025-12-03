-- Add job_order_id column to uid_registry for tracking UIDs created from job order completion

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='uid_registry' AND column_name='job_order_id'
    ) THEN
        ALTER TABLE uid_registry ADD COLUMN job_order_id UUID REFERENCES production_job_orders(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added job_order_id column to uid_registry';
    ELSE
        RAISE NOTICE 'job_order_id column already exists in uid_registry';
    END IF;
END $$;

-- Create index for job_order_id lookups
CREATE INDEX IF NOT EXISTS idx_uid_registry_job_order ON uid_registry(job_order_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Job Order UID tracking added successfully';
    RAISE NOTICE 'UIDs created from job order completion will now be tracked';
END $$;
