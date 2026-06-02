-- =====================================================
-- RECOVER STOCK DATA FOR SEN-TEM-LM61
-- =====================================================

-- Step 1: Check if backup exists and has the data
SELECT 
    b.metadata->>'grn_reference' as grn_ref,
    b.quantity,
    b.available_quantity,
    b.created_at,
    b.metadata
FROM stock_entries_backup_20250602 b
JOIN items i ON i.id = b.item_id
WHERE i.code = 'SEN-TEM-LM61'
ORDER BY b.created_at;

-- Step 2: If backup has data, restore ONLY the unique entries (not duplicates)
-- First, check what's in the backup for this item
SELECT 
    COUNT(*) as total_backup_rows,
    COUNT(DISTINCT metadata->>'grn_reference') as unique_grns
FROM stock_entries_backup_20250602 b
JOIN items i ON i.id = b.item_id
WHERE i.code = 'SEN-TEM-LM61';

-- Step 3: Restore ONLY one entry per GRN (the oldest/original one)
INSERT INTO stock_entries (
    tenant_id, item_id, warehouse_id, quantity, available_quantity,
    allocated_quantity, unit_price, batch_number, metadata, created_at, created_from
)
SELECT DISTINCT ON (b.metadata->>'grn_reference')
    b.tenant_id,
    b.item_id,
    b.warehouse_id,
    b.quantity,
    b.available_quantity,
    b.allocated_quantity,
    b.unit_price,
    b.batch_number,
    b.metadata,
    b.created_at,
    b.created_from
FROM stock_entries_backup_20250602 b
JOIN items i ON i.id = b.item_id
WHERE i.code = 'SEN-TEM-LM61'
  AND b.metadata->>'grn_reference' IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se 
      WHERE se.id = b.id
  )
ORDER BY b.metadata->>'grn_reference', b.created_at ASC;

-- Step 4: If no backup or backup also empty, manually insert the correct stock
-- Based on your screenshot: 256 purchased, 3 used = 253 available
-- INSERT INTO stock_entries (
--     tenant_id, item_id, warehouse_id, quantity, available_quantity,
--     allocated_quantity, unit_price, batch_number, metadata, created_at
-- ) VALUES (
--     (SELECT tenant_id FROM items WHERE code = 'SEN-TEM-LM61'),
--     (SELECT id FROM items WHERE code = 'SEN-TEM-LM61'),
--     (SELECT id FROM warehouses WHERE tenant_id = (SELECT tenant_id FROM items WHERE code = 'SEN-TEM-LM61') LIMIT 1),
--     256, 253, 3, 0, NULL,
--     '{"grn_reference": "ADJ-000083", "notes": "Manual recovery - Original GRN ADJ-000083, 256 qty received"}'::jsonb,
--     NOW()
-- );

-- Step 5: Rebuild inventory_stock after recovery
TRUNCATE TABLE inventory_stock;

INSERT INTO inventory_stock (
    tenant_id, item_id, warehouse_id, location_id, category,
    quantity, reserved_quantity, updated_at
)
SELECT 
    se.tenant_id,
    se.item_id,
    COALESCE(se.warehouse_id, (SELECT id FROM warehouses WHERE tenant_id = se.tenant_id LIMIT 1)),
    NULL, 'RAW_MATERIAL',
    SUM(se.quantity),
    SUM(se.quantity - se.available_quantity),
    NOW()
FROM stock_entries se
WHERE se.quantity > 0 OR se.available_quantity > 0
GROUP BY se.tenant_id, se.item_id, se.warehouse_id;

-- Step 6: Verify recovery
SELECT 
    'SEN-TEM-LM61 AFTER RECOVERY' as status,
    i.code,
    SUM(se.quantity) as qty,
    SUM(se.available_quantity) as available,
    COUNT(se.id) as entry_count
FROM stock_entries se
JOIN items i ON i.id = se.item_id
WHERE i.code = 'SEN-TEM-LM61'
GROUP BY i.id, i.code;
