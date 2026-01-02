-- Migration: Add partial conversion tracking to quotations
-- Description: Track how much of each quotation item has been converted to sales orders
--              This allows creating multiple SOs from a single quotation with proper tracking

-- Add converted_quantity column to quotation_items
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS converted_quantity DECIMAL(12,2) DEFAULT 0;

-- Add pending_quantity as a generated column (auto-calculated)
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS pending_quantity DECIMAL(12,2) 
GENERATED ALWAYS AS (quantity - converted_quantity) STORED;

-- Add PARTIALLY_CONVERTED status to quotation_status enum
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'quotation_status' 
    AND e.enumlabel = 'PARTIALLY_CONVERTED'
  ) THEN
    ALTER TYPE quotation_status ADD VALUE 'PARTIALLY_CONVERTED';
  END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN quotation_items.converted_quantity IS 'Total quantity converted to sales orders (allows partial fulfillment)';
COMMENT ON COLUMN quotation_items.pending_quantity IS 'Auto-calculated: quantity - converted_quantity (remaining to be converted)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quotation_items_pending 
ON quotation_items(quotation_id) 
WHERE pending_quantity > 0;

-- Update existing quotations that are already converted
-- Set converted_quantity = quantity for CONVERTED quotations
UPDATE quotation_items qi
SET converted_quantity = qi.quantity
FROM quotations q
WHERE qi.quotation_id = q.id 
AND q.status = 'CONVERTED';

SELECT 
  'Migration completed successfully!' AS status,
  COUNT(*) AS updated_items
FROM quotation_items
WHERE converted_quantity > 0;
