-- ============================================
-- ADD STATUS COLUMN TO GRNS TABLE
-- This fixes the missing status column issue
-- ============================================

-- Step 1: Add status column to grns table
ALTER TABLE grns 
ADD COLUMN IF NOT EXISTS status grn_status DEFAULT 'DRAFT';

-- Step 2: Verify the column was added
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'grns' 
  AND column_name = 'status';

-- Step 3: Show confirmation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'grns' AND column_name = 'status'
  ) THEN
    RAISE NOTICE '✅ SUCCESS: Status column added to grns table';
  ELSE
    RAISE NOTICE '❌ FAILED: Status column not found in grns table';
  END IF;
END $$;
