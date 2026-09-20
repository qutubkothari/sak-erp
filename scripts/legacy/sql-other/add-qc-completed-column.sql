-- Add QC completed flag to GRNs table
ALTER TABLE grns
ADD COLUMN IF NOT EXISTS qc_completed BOOLEAN DEFAULT FALSE;

-- Update existing completed GRNs to have qc_completed = true
UPDATE grns 
SET qc_completed = TRUE
WHERE status = 'COMPLETED';

-- Add comment
COMMENT ON COLUMN grns.qc_completed IS 'Whether QC inspection has been completed for all items';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'grns' AND column_name = 'qc_completed';
