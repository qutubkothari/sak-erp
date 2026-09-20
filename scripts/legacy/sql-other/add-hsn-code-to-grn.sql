-- Add supplier HSN code field to GRN items
-- This allows tracking HSN codes from supplier invoices and comparing with master data

-- Add supplier_hsn_code column to grn_items
ALTER TABLE grn_items 
ADD COLUMN IF NOT EXISTS supplier_hsn_code VARCHAR(20);

-- Add comment
COMMENT ON COLUMN grn_items.supplier_hsn_code IS 'HSN code as per supplier invoice, may differ from item master';

-- Create index for faster lookups when HSN codes differ
CREATE INDEX IF NOT EXISTS idx_grn_items_supplier_hsn 
ON grn_items(supplier_hsn_code) 
WHERE supplier_hsn_code IS NOT NULL;
