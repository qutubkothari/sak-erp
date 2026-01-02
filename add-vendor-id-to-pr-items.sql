-- Add optional vendor selection per purchase requisition item

ALTER TABLE purchase_requisition_items
ADD COLUMN IF NOT EXISTS vendor_id UUID;

-- Optional FK (will require vendors table to exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_requisition_items_vendor_id_fkey'
  ) THEN
    ALTER TABLE purchase_requisition_items
    ADD CONSTRAINT purchase_requisition_items_vendor_id_fkey
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pr_items_vendor_id ON purchase_requisition_items(vendor_id);
