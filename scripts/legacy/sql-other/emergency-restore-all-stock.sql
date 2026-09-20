-- =====================================================
-- EMERGENCY RESTORE: Recover ALL Stock from Backup
-- =====================================================

-- Step 1: Check what's in the backup
SELECT 
    COUNT(DISTINCT item_id) as items_in_backup,
    SUM(quantity) as total_qty_backup,
    SUM(available_quantity) as total_available_backup,
    COUNT(*) as total_rows_backup
FROM stock_entries_backup_20250602
WHERE COALESCE(quantity, 0) > 0 OR COALESCE(available_quantity, 0) > 0;

-- Step 2: Check current state
SELECT 
    COUNT(DISTINCT item_id) as items_current,
    SUM(quantity) as total_qty_current,
    SUM(available_quantity) as total_available_current,
    COUNT(*) as total_rows_current
FROM stock_entries
WHERE COALESCE(quantity, 0) > 0 OR COALESCE(available_quantity, 0) > 0;

-- Step 3: Find items missing from current stock_entries but present in backup
SELECT 
    i.code,
    i.name,
    b.quantity as backup_qty,
    b.available_quantity as backup_available,
    b.metadata->>'grn_reference' as grn_ref,
    b.created_at
FROM stock_entries_backup_20250602 b
JOIN items i ON i.id = b.item_id
LEFT JOIN stock_entries se ON se.item_id = b.item_id AND se.tenant_id = b.tenant_id
WHERE se.id IS NULL  -- Not in current stock_entries
  AND (COALESCE(b.quantity, 0) > 0 OR COALESCE(b.available_quantity, 0) > 0)
ORDER BY b.created_at DESC
LIMIT 100;

-- Step 4: RESTORE all missing stock entries from backup
-- This inserts only rows that don't exist in current stock_entries
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
SELECT DISTINCT ON (b.tenant_id, b.item_id, b.warehouse_id, COALESCE(b.metadata->>'grn_reference', b.id::text))
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
WHERE (COALESCE(b.quantity, 0) > 0 OR COALESCE(b.available_quantity, 0) > 0)
  AND NOT EXISTS (
      SELECT 1 
      FROM stock_entries se 
      WHERE se.tenant_id = b.tenant_id 
        AND se.item_id = b.item_id
        AND COALESCE(se.warehouse_id::text, '') = COALESCE(b.warehouse_id::text, '')
  )
ORDER BY b.tenant_id, b.item_id, b.warehouse_id, COALESCE(b.metadata->>'grn_reference', b.id::text), b.created_at ASC;

-- Step 5: Rebuild inventory_stock from all current stock_entries
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

-- Step 6: Verify recovery
SELECT 
    'AFTER RESTORE' as status,
    COUNT(DISTINCT item_id) as items_with_stock,
    SUM(quantity) as total_qty,
    SUM(available_quantity) as total_available
FROM inventory_stock;

-- Step 7: Check specific items
SELECT 
    i.code,
    i.name,
    SUM(inv.quantity) as qty,
    SUM(inv.available_quantity) as available
FROM inventory_stock inv
JOIN items i ON i.id = inv.item_id
WHERE i.code IN ('SEN-TEM-LM61', 'SEN-TEM-LM61')
GROUP BY i.code, i.name;

-- Step 8: Check coverage
SELECT 
    COUNT(*) FILTER (WHERE inv.item_id IS NULL) as still_missing_stock,
    COUNT(*) FILTER (WHERE COALESCE(inv.available_quantity, 0) = 0) as still_zero_available,
    COUNT(*) as total_items
FROM items i
LEFT JOIN inventory_stock inv ON inv.item_id = i.id
WHERE i.is_active = true;
