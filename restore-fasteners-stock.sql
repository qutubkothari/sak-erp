-- =====================================================
-- RESTORE FASTENERS STOCK FROM BACKUP
-- =====================================================

-- 1. Check which items need restoration
SELECT 
    i.code,
    b.quantity as backup_qty,
    b.available_quantity as backup_available,
    b.id as backup_entry_id,
    se.id as current_entry_id
FROM items i
LEFT JOIN stock_entries_backup_20250602 b ON b.item_id = i.id
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE i.code IN (
    'FAS-BLT-CSK-4M8M-PH-304SS',
    'FAS-BLT-CSK-3M20M-PH-304SS',
    'FAS-BLT-ALN-4M10M-HX-304SS',
    'FAS-BLT-ALN-4M20M-HX-304SS',
    'FAS-NUT-4M-HEX-304SS'
)
AND se.id IS NULL;  -- Missing from current stock_entries

-- 2. Restore missing fasteners from backup (one entry per item-warehouse)
INSERT INTO stock_entries (
    tenant_id,
    item_id,
    warehouse_id,
    quantity,
    available_quantity,
    allocated_quantity,
    unit_price,
    batch_number,
    metadata,
    created_at
)
SELECT DISTINCT ON (b.item_id, b.warehouse_id)
    b.tenant_id,
    b.item_id,
    b.warehouse_id,
    b.quantity,
    b.available_quantity,
    COALESCE(b.allocated_quantity, 0),
    COALESCE(b.unit_price, 0),
    b.batch_number,
    jsonb_build_object(
        'restored_from_backup', true,
        'restored_at', NOW(),
        'original_backup_id', b.id,
        'original_created_at', b.created_at
    ),
    b.created_at
FROM stock_entries_backup_20250602 b
JOIN items i ON i.id = b.item_id
LEFT JOIN stock_entries se ON se.item_id = b.item_id AND se.tenant_id = b.tenant_id
WHERE i.code IN (
    'FAS-BLT-CSK-4M8M-PH-304SS',
    'FAS-BLT-CSK-3M20M-PH-304SS',
    'FAS-BLT-ALN-4M10M-HX-304SS',
    'FAS-BLT-ALN-4M20M-HX-304SS',
    'FAS-NUT-4M-HEX-304SS'
)
AND se.id IS NULL  -- Only if not already in stock_entries
ORDER BY b.item_id, b.warehouse_id, b.created_at ASC;

-- 3. Check for more items with backup stock but missing from current
-- Find all items in backup with stock that aren't in current stock_entries
SELECT 
    i.code,
    i.name,
    SUM(b.quantity) as backup_total_qty,
    0 as current_qty
FROM stock_entries_backup_20250602 b
JOIN items i ON i.id = b.item_id
LEFT JOIN stock_entries se ON se.item_id = b.item_id AND se.tenant_id = b.tenant_id
WHERE se.id IS NULL
  AND (COALESCE(b.quantity, 0) > 0 OR COALESCE(b.available_quantity, 0) > 0)
GROUP BY i.id, i.code, i.name
ORDER BY SUM(b.quantity) DESC
LIMIT 50;

-- 4. Restore ALL missing items from backup (comprehensive recovery)
INSERT INTO stock_entries (
    tenant_id,
    item_id,
    warehouse_id,
    quantity,
    available_quantity,
    allocated_quantity,
    unit_price,
    batch_number,
    metadata,
    created_at
)
SELECT DISTINCT ON (b.item_id, b.warehouse_id)
    b.tenant_id,
    b.item_id,
    b.warehouse_id,
    b.quantity,
    b.available_quantity,
    COALESCE(b.allocated_quantity, 0),
    COALESCE(b.unit_price, 0),
    b.batch_number,
    jsonb_build_object(
        'restored_from_backup', true,
        'restored_at', NOW(),
        'original_backup_id', b.id
    ),
    b.created_at
FROM stock_entries_backup_20250602 b
LEFT JOIN stock_entries se ON se.item_id = b.item_id AND se.tenant_id = b.tenant_id
WHERE se.id IS NULL  -- Only missing items
  AND (COALESCE(b.quantity, 0) > 0 OR COALESCE(b.available_quantity, 0) > 0)
ORDER BY b.item_id, b.warehouse_id, b.created_at ASC;

-- 5. Rebuild inventory_stock
TRUNCATE TABLE inventory_stock;

INSERT INTO inventory_stock (
    tenant_id,
    item_id,
    warehouse_id,
    location_id,
    category,
    quantity,
    reserved_quantity,
    updated_at
)
SELECT 
    se.tenant_id,
    se.item_id,
    COALESCE(se.warehouse_id, (SELECT id FROM warehouses WHERE tenant_id = se.tenant_id LIMIT 1)),
    NULL,
    'RAW_MATERIAL',
    SUM(se.quantity),
    SUM(COALESCE(se.quantity, 0) - COALESCE(se.available_quantity, 0)),
    NOW()
FROM stock_entries se
WHERE COALESCE(se.quantity, 0) > 0 OR COALESCE(se.available_quantity, 0) > 0
GROUP BY se.tenant_id, se.item_id, se.warehouse_id;

-- 6. Verify fasteners are restored
SELECT 
    i.code,
    i.name,
    SUM(inv.quantity) as qty,
    SUM(inv.available_quantity) as available
FROM inventory_stock inv
JOIN items i ON i.id = inv.item_id
WHERE i.code IN (
    'FAS-BLT-CSK-4M8M-PH-304SS',
    'FAS-BLT-CSK-3M20M-PH-304SS',
    'FAS-BLT-ALN-4M10M-HX-304SS',
    'FAS-BLT-ALN-4M20M-HX-304SS',
    'FAS-NUT-4M-HEX-304SS'
)
GROUP BY i.id, i.code, i.name;

-- 7. Final summary
SELECT 
    'FINAL' as status,
    COUNT(DISTINCT item_id) as items_with_stock,
    SUM(quantity) as total_qty,
    SUM(available_quantity) as total_available
FROM inventory_stock;
