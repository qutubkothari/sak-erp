-- Add QC acceptance fields to GRN items
-- This enables two-step process: Receive → QC Accept/Reject

-- Add QC status to track acceptance state
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qc_status_enum') THEN
        CREATE TYPE qc_status_enum AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'PARTIAL');
    END IF;
END $$;

-- Add QC-related columns to grn_items
ALTER TABLE grn_items 
ADD COLUMN IF NOT EXISTS received_qty NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS accepted_qty NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rejected_qty NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS qc_status qc_status_enum DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS qc_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS qc_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS qc_notes TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing data: copy quantity to received_qty and accepted_qty for completed GRNs
UPDATE grn_items 
SET received_qty = quantity,
    accepted_qty = quantity,
    qc_status = 'ACCEPTED'
WHERE received_qty IS NULL 
  AND EXISTS (
    SELECT 1 FROM grn 
    WHERE grn.id = grn_items.grn_id 
    AND grn.status = 'COMPLETED'
  );

-- For pending GRNs, just set received_qty
UPDATE grn_items 
SET received_qty = quantity
WHERE received_qty IS NULL;

-- Create index for QC status filtering
CREATE INDEX IF NOT EXISTS idx_grn_items_qc_status 
ON grn_items(qc_status);

-- Add comments
COMMENT ON COLUMN grn_items.received_qty IS 'Physical quantity received from vendor';
COMMENT ON COLUMN grn_items.accepted_qty IS 'Quantity passed QC inspection';
COMMENT ON COLUMN grn_items.rejected_qty IS 'Quantity failed QC inspection';
COMMENT ON COLUMN grn_items.qc_status IS 'QC inspection status: PENDING/ACCEPTED/REJECTED/PARTIAL';
