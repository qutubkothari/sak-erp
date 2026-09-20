-- Add item_id column to purchase_order_items for proper relationship with items table
-- This enables PostgREST to resolve the items relationship

-- 1. Add item_id column (nullable initially since existing rows don't have it)
ALTER TABLE purchase_order_items 
ADD COLUMN IF NOT EXISTS item_id UUID;

-- 2. Try to populate item_id from existing item_code (if items table has matching codes)
UPDATE purchase_order_items poi
SET item_id = i.id
FROM items i
WHERE poi.item_code = i.code
  AND poi.item_id IS NULL;

-- 3. Add foreign key constraint
ALTER TABLE purchase_order_items 
DROP CONSTRAINT IF EXISTS purchase_order_items_item_id_fkey;

ALTER TABLE purchase_order_items
ADD CONSTRAINT purchase_order_items_item_id_fkey 
FOREIGN KEY (item_id) 
REFERENCES items(id) 
ON DELETE RESTRICT;

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_id 
ON purchase_order_items(item_id);

-- Verify the changes
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_order_items'
  AND column_name = 'item_id';

-- Check foreign key
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'purchase_order_items' 
    AND kcu.column_name = 'item_id'
    AND tc.constraint_type = 'FOREIGN KEY';
