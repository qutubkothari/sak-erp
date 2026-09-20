-- Fix missing item_id in grn_items by looking up from items table using item_code
-- This will populate item_id for all grn_items that have item_code but null item_id

UPDATE grn_items gi
SET item_id = i.id
FROM items i
WHERE gi.item_code = i.code
  AND gi.item_id IS NULL
  AND gi.item_code IS NOT NULL;

-- Verify the fix
SELECT 
  gi.id,
  gi.grn_id,
  gi.item_code,
  gi.item_id,
  i.code as verified_item_code,
  i.description as item_description
FROM grn_items gi
LEFT JOIN items i ON i.id = gi.item_id
WHERE gi.item_code IS NOT NULL
ORDER BY gi.created_at DESC
LIMIT 10;
