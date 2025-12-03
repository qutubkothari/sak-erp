-- Check what's in GRN-2025-12-003
SELECT 
  g.grn_number,
  g.status,
  g.warehouse_id,
  COUNT(gi.id) as item_count
FROM grns g
LEFT JOIN grn_items gi ON g.id = gi.grn_id
WHERE g.id = '9196e1fa-3727-4411-9f5d-9086452814dd'
GROUP BY g.grn_number, g.status, g.warehouse_id;

-- Check if grn_items table has any records at all
SELECT COUNT(*) as total_grn_items FROM grn_items;

-- Find the item_id from the UIDs
SELECT DISTINCT ur.entity_id as item_id
FROM uid_registry ur
WHERE ur.grn_id = '9196e1fa-3727-4411-9f5d-9086452814dd';
