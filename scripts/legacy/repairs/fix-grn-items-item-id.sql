-- Fix grn_items: Populate item_id from items table using item_code
UPDATE grn_items gi
SET item_id = i.id
FROM items i
WHERE gi.item_code = i.code
  AND gi.item_id IS NULL;

-- Verify the update for GRN-2025-12-017
SELECT 
  gi.id,
  gi.grn_id,
  gi.item_code,
  gi.item_id,
  gi.rejected_qty,
  gi.rate,
  gi.rejection_amount,
  gi.return_status
FROM grn_items gi
WHERE gi.grn_id = 'e3b08ff3-2ed1-484c-a66e-f086a8528292'
  AND gi.rejected_qty > 0;

-- Check total rows updated
SELECT COUNT(*) as total_grn_items_fixed
FROM grn_items
WHERE item_id IS NOT NULL;
