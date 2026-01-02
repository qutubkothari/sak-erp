-- Diagnostic: Check stock entries and verify tenant_id matching

-- 1. Check stock entries exist
SELECT 
  COUNT(*) as total_stock_entries,
  COUNT(DISTINCT item_id) as unique_items,
  COUNT(DISTINCT tenant_id) as unique_tenants
FROM stock_entries;

-- 2. Show stock entries with item details
SELECT 
  se.id,
  se.tenant_id,
  i.code as item_code,
  i.name as item_name,
  se.quantity,
  se.available_quantity,
  se.allocated_quantity,
  w.name as warehouse_name,
  se.metadata->>'grn_reference' as grn_number,
  se.created_at
FROM stock_entries se
LEFT JOIN items i ON i.id = se.item_id
LEFT JOIN warehouses w ON w.id = se.warehouse_id
ORDER BY se.created_at DESC
LIMIT 20;

-- 3. Check for tenant_id mismatches
-- Get tenant_id from users, items, and stock_entries
SELECT 
  'users' as source,
  tenant_id,
  COUNT(*) as count
FROM users
GROUP BY tenant_id

UNION ALL

SELECT 
  'items' as source,
  tenant_id,
  COUNT(*) as count
FROM items
GROUP BY tenant_id

UNION ALL

SELECT 
  'stock_entries' as source,
  tenant_id,
  COUNT(*) as count
FROM stock_entries
GROUP BY tenant_id;
