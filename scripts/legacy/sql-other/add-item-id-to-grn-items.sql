-- Add item_id column to grn_items table
ALTER TABLE grn_items
ADD COLUMN item_id UUID REFERENCES items(id);

-- Create index for the new column
CREATE INDEX idx_grn_items_item ON grn_items(item_id);

-- Update existing records to populate item_id based on item_code
UPDATE grn_items
SET item_id = items.id
FROM items
WHERE grn_items.item_code = items.code
AND grn_items.item_id IS NULL;