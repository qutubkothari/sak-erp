-- ============================================
-- INVENTORY DATA CHECK FOR SUPABASE SQL EDITOR
-- Run this in your Supabase dashboard SQL Editor
-- ============================================

-- 1. Check recent GRNs
SELECT 
  g.id, 
  g.grn_number, 
  g.receipt_date,
  g.created_at,
  g.po_id,
  g.warehouse_id,
  COUNT(gi.id) as item_count
FROM grns g
LEFT JOIN grn_items gi ON gi.grn_id = g.id
WHERE g.tenant_id = 'e42c0f96-e3c0-43bb-bce3-81c0f0ed6c88'
GROUP BY g.id, g.grn_number, g.receipt_date, g.created_at, g.po_id, g.warehouse_id
ORDER BY g.created_at DESC 
LIMIT 5;

-- 2. Check if stock_entries exist (should have data from GRN)
SELECT COUNT(*) as total_stock_entries
FROM stock_entries
WHERE tenant_id = 'e42c0f96-e3c0-43bb-bce3-81c0f0ed6c88';

-- 3. Check sample stock_entries data
SELECT 
  id,
  item_id,
  warehouse_id,
  quantity,
  available_quantity,
  allocated_quantity,
  batch_number,
  unit_price,
  metadata->>'grn_id' as grn_id_in_metadata,
  created_at
FROM stock_entries
WHERE tenant_id = 'e42c0f96-e3c0-43bb-bce3-81c0f0ed6c88'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if inventory_stock table exists and has data
SELECT COUNT(*) as total_inventory_stock_records
FROM inventory_stock
WHERE tenant_id = 'e42c0f96-e3c0-43bb-bce3-81c0f0ed6c88';

-- 5. Check sample inventory_stock table data  
SELECT 
  id,
  item_id,
  warehouse_id,
  quantity,
  available_quantity,
  reserved_quantity,
  reorder_point,
  updated_at
FROM inventory_stock
WHERE tenant_id = 'e42c0f96-e3c0-43bb-bce3-81c0f0ed6c88'
ORDER BY updated_at DESC
LIMIT 10;

-- 6. Check UIDs generated for GRNs
SELECT 
  grn_id,
  COUNT(*) as uid_count,
  entity_type
FROM uid_registry
WHERE tenant_id = 'e42c0f96-e3c0-43bb-bce3-81c0f0ed6c88'
  AND grn_id IS NOT NULL
GROUP BY grn_id, entity_type
ORDER BY grn_id DESC
LIMIT 10;

-- 7. Check recent stock movements
SELECT 
  id,
  movement_type,
  item_id,
  quantity,
  from_warehouse_id,
  to_warehouse_id,
  reference_type,
  reference_number,
  movement_date
FROM stock_movements
WHERE tenant_id = 'e42c0f96-e3c0-43bb-bce3-81c0f0ed6c88'
ORDER BY movement_date DESC
LIMIT 10;

-- 8. Check if any GRN has corresponding stock entries
SELECT 
  g.grn_number,
  g.receipt_date,
  COUNT(DISTINCT gi.id) as grn_items_count,
  COUNT(DISTINCT se.id) as stock_entry_count,
  COUNT(DISTINCT u.id) as uid_count
FROM grns g
LEFT JOIN grn_items gi ON gi.grn_id = g.id
LEFT JOIN stock_entries se ON se.tenant_id = g.tenant_id 
  AND se.metadata->>'grn_id' = g.id::text
LEFT JOIN uid_registry u ON u.grn_id = g.id 
  AND u.tenant_id = g.tenant_id
WHERE g.tenant_id = 'e42c0f96-e3c0-43bb-bce3-81c0f0ed6c88'
GROUP BY g.id, g.grn_number, g.receipt_date
ORDER BY g.created_at DESC
LIMIT 5;

-- 9. Check if items exist in both tables
SELECT 
  i.id as item_id,
  i.code as item_code,
  i.name as item_name,
  COALESCE(se.total_in_stock_entries, 0) as qty_in_stock_entries,
  COALESCE(inv.quantity, 0) as qty_in_inventory_stock
FROM items i
LEFT JOIN (
  SELECT item_id, SUM(quantity) as total_in_stock_entries
  FROM stock_entries
  WHERE tenant_id = 'e42c0f96-e3c0-43bb-bce3-81c0f0ed6c88'
  GROUP BY item_id
) se ON se.item_id = i.id
LEFT JOIN inventory_stock inv ON inv.item_id = i.id 
  AND inv.tenant_id = 'e42c0f96-e3c0-43bb-bce3-81c0f0ed6c88'
WHERE i.tenant_id = 'e42c0f96-e3c0-43bb-bce3-81c0f0ed6c88'
ORDER BY i.created_at DESC
LIMIT 20;
