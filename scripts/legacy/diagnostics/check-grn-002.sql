-- Check GRN-2025-12-002 details
SELECT 
  g.grn_number,
  g.created_at::date as grn_date,
  gi.item_code,
  gi.item_name,
  gi.ordered_quantity,
  gi.received_quantity,
  gi.accepted_quantity,
  gi.rejected_quantity
FROM grns g
JOIN grn_items gi ON g.id = gi.grn_id
WHERE g.grn_number = 'GRN-2025-12-002'
ORDER BY gi.item_code;

-- Check stock entries for these items from GRN-2025-12-002
SELECT 
  se.item_code,
  se.quantity,
  se.transaction_type,
  se.reference_number,
  se.metadata->>'grn_reference' as grn_ref,
  se.created_at::date as stock_date
FROM stock_entries se
WHERE se.metadata->>'grn_reference' = 'GRN-2025-12-002'
ORDER BY se.item_code;

-- Check UIDs generated for GRN-2025-12-002
SELECT 
  g.grn_number,
  ur.item_code,
  COUNT(ur.id) as uid_count
FROM uid_registry ur
JOIN grns g ON ur.grn_id = g.id
WHERE g.grn_number = 'GRN-2025-12-002'
GROUP BY g.grn_number, ur.item_code
ORDER BY ur.item_code;

-- Check current inventory levels for items in GRN-2025-12-002
SELECT 
  i.code as item_code,
  i.name as item_name,
  i.stock_quantity,
  i.updated_at::date as last_updated
FROM items i
WHERE i.code IN (
  SELECT gi.item_code 
  FROM grn_items gi
  JOIN grns g ON gi.grn_id = g.id
  WHERE g.grn_number = 'GRN-2025-12-002'
)
ORDER BY i.code;
