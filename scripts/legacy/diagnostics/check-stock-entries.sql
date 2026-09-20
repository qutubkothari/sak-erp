-- Check if stock_entries table has any data
SELECT 
  se.id,
  se.item_id,
  i.code as item_code,
  i.description,
  se.warehouse_id,
  w.name as warehouse_name,
  se.quantity,
  se.available_quantity,
  se.allocated_quantity,
  se.batch_number,
  se.metadata,
  se.created_at
FROM stock_entries se
LEFT JOIN items i ON i.id = se.item_id
LEFT JOIN warehouses w ON w.id = se.warehouse_id
ORDER BY se.created_at DESC
LIMIT 20;

-- Check GRN data
SELECT 
  grn_number,
  warehouse_id,
  status,
  created_at
FROM grns
ORDER BY created_at DESC
LIMIT 5;

-- Check GRN items
SELECT 
  gi.id,
  gi.grn_id,
  g.grn_number,
  gi.item_id,
  i.code as item_code,
  gi.accepted_qty,
  gi.rejected_qty,
  gi.qc_status,
  gi.batch_number
FROM grn_items gi
JOIN grns g ON g.id = gi.grn_id
LEFT JOIN items i ON i.id = gi.item_id
ORDER BY gi.created_at DESC
LIMIT 10;

-- Check UIDs
SELECT 
  id,
  uid_code,
  item_code,
  item_name,
  current_status,
  created_at
FROM uids
ORDER BY created_at DESC
LIMIT 10;
