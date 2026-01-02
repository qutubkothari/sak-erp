-- Check stock for RAD-TRR-QX71W915
SELECT 
  i.code as item_code,
  i.name as item_name,
  i.id as item_id,
  COALESCE(SUM(se.available_quantity), 0) as total_available_stock,
  COUNT(se.id) as stock_entry_count
FROM items i
LEFT JOIN stock_entries se ON se.item_id = i.id AND se.tenant_id = i.tenant_id
WHERE i.code = 'RAD-TRR-QX71W915'
GROUP BY i.id, i.code, i.name;

-- Show all stock entries with full details
SELECT 
  se.id,
  i.code as item_code,
  i.name as item_name,
  se.quantity,
  se.available_quantity,
  se.allocated_quantity,
  w.name as warehouse_name,
  se.metadata->>'grn_reference' as grn_reference,
  se.created_at
FROM stock_entries se
JOIN items i ON i.id = se.item_id
LEFT JOIN warehouses w ON w.id = se.warehouse_id
WHERE i.code = 'RAD-TRR-QX71W915'
ORDER BY se.created_at DESC;
