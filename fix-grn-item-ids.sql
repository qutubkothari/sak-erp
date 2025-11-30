-- Update existing GRN items to populate item_id based on item_code
UPDATE grn_items
SET item_id = items.id
FROM items
WHERE grn_items.item_code = items.code
AND grn_items.item_id IS NULL;