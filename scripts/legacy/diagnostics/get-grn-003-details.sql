-- Get the actual GRN item details for manual stock entry creation
SELECT 
  gi.id as grn_item_id,
  gi.item_id,
  gi.accepted_qty,
  g.id as grn_id,
  g.grn_number,
  g.warehouse_id,
  g.created_at,
  i.code as item_code,
  i.name as item_name
FROM grns g
JOIN grn_items gi ON g.id = gi.grn_id
JOIN items i ON gi.item_id = i.id
WHERE g.id = '9196e1fa-3727-4411-9f5d-9086452814dd';
