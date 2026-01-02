-- Check ALL items with stock (items that have available_quantity > 0)
SELECT 
  i.id as item_id,
  i.code as item_code,
  i.name as item_name,
  i.uom,
  COALESCE(SUM(se.available_quantity), 0) as total_available_stock,
  COALESCE(SUM(se.quantity), 0) as total_quantity,
  COALESCE(SUM(se.allocated_quantity), 0) as total_allocated,
  COUNT(se.id) as stock_entry_count,
  i.created_at as item_created_at
FROM items i
LEFT JOIN stock_entries se ON se.item_id = i.id AND se.tenant_id = i.tenant_id
WHERE i.tenant_id IS NOT NULL
GROUP BY i.id, i.code, i.name, i.uom, i.created_at
HAVING COALESCE(SUM(se.available_quantity), 0) > 0
ORDER BY total_available_stock DESC
LIMIT 50;

-- Summary: Total items vs items with stock
SELECT 
  COUNT(DISTINCT i.id) as total_items,
  COUNT(DISTINCT CASE WHEN se.available_quantity > 0 THEN i.id END) as items_with_stock,
  COUNT(DISTINCT se.id) as total_stock_entries,
  SUM(se.available_quantity) as total_available_stock
FROM items i
LEFT JOIN stock_entries se ON se.item_id = i.id AND se.tenant_id = i.tenant_id
WHERE i.tenant_id IS NOT NULL;

-- Sample of stock entries to verify data structure
SELECT 
  se.id,
  se.item_id,
  i.code as item_code,
  i.name as item_name,
  se.quantity,
  se.available_quantity,
  se.allocated_quantity,
  se.tenant_id,
  w.name as warehouse_name,
  se.created_at
FROM stock_entries se
JOIN items i ON i.id = se.item_id
LEFT JOIN warehouses w ON w.id = se.warehouse_id
WHERE se.available_quantity > 0
ORDER BY se.created_at DESC
LIMIT 20;
