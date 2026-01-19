-- Migration: Add is_preferred flag to vendors table
-- Purpose: Mark vendors as preferred so they appear in RFQ vendor selection
-- Author: System
-- Date: 2025-01-XX

-- Add the is_preferred column
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_vendors_is_preferred 
ON vendors(is_preferred) 
WHERE is_preferred = true;

-- Update comment
COMMENT ON COLUMN vendors.is_preferred IS 'Flag to mark vendor as preferred for RFQ selection';

-- Optionally, you can mark existing vendors with purchase history as preferred
-- UPDATE vendors v
-- SET is_preferred = true
-- WHERE EXISTS (
--   SELECT 1 FROM purchase_orders po
--   WHERE po.vendor_id = v.id
--   AND po.status IN ('APPROVED', 'COMPLETED')
-- );

-- Verify the change
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'vendors' 
AND column_name = 'is_preferred';
