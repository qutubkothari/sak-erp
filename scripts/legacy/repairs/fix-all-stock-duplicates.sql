-- =====================================================
-- EMERGENCY STOCK CLEANUP - Fix All Doubled Quantities
-- =====================================================

-- Step 0: Count affected items before cleanup
SELECT 'BEFORE CLEANUP - Items with duplicate stock entries:' as status;
SELECT 
    i.code,
    i.name,
    COUNT(se.id) as entry_count,
    COUNT(DISTINCT se.metadata->>'grn_reference') as unique_grns,
    SUM(se.quantity) as doubled_qty,
    COUNT(DISTINCT se.metadata->>'grn_reference') * 256 as expected_qty
FROM items i
JOIN stock_entries se ON se.item_id = i.id
GROUP BY i.id, i.code, i.name
HAVING COUNT(se.id) > COUNT(DISTINCT se.metadata->>'grn_reference')
ORDER BY COUNT(se.id) DESC;

-- Step 1: Create backup
CREATE TABLE IF NOT EXISTS stock_entries_backup_$(date +%Y%m%d) AS 
SELECT * FROM stock_entries;

-- Step 2: Find and list all entries that will be deleted (for audit)
SELECT 
    i.code,
    i.name,
    se.metadata->>'grn_reference' as grn_ref,
    se.warehouse_id,
    se.id as entry_to_delete,
    se.quantity,
    se.created_at,
    ROW_NUMBER() OVER (
        PARTITION BY se.item_id, se.warehouse_id, se.metadata->>'grn_reference' 
        ORDER BY se.created_at ASC
    ) as row_num
FROM stock_entries se
JOIN items i ON i.id = se.item_id
WHERE se.metadata->>'grn_reference' IS NOT NULL
  AND ROW_NUMBER() OVER (
      PARTITION BY se.item_id, se.warehouse_id, se.metadata->>'grn_reference' 
      ORDER BY se.created_at ASC
  ) > 1;

-- Step 3: DELETE duplicates keeping only the oldest entry per GRN+item+warehouse
DELETE FROM stock_entries
WHERE id IN (
    SELECT id FROM (
        SELECT 
            se.id,
            ROW_NUMBER() OVER (
                PARTITION BY 
                    se.item_id,
                    se.warehouse_id,
                    COALESCE(se.metadata->>'grn_reference', se.metadata->>'uid_reference', se.batch_number || '_' || se.created_at::text)
                ORDER BY se.created_at ASC
            ) as rn
        FROM stock_entries se
    ) t
    WHERE rn > 1
);

-- Step 4: Also delete synthetic/reconciled entries that were created by the buggy logic
DELETE FROM stock_entries
WHERE metadata->>'reconciled_from_inventory_stock' = 'true'
   OR metadata->>'source' = 'reconcile'
   OR metadata->>'reason' ILIKE '%inventory_stock showed more%';

-- Step 5: Clear inventory_stock completely
TRUNCATE TABLE inventory_stock;

-- Step 6: Recalculate inventory_stock from cleaned stock_entries
INSERT INTO inventory_stock (
    tenant_id, item_id, warehouse_id, location_id, category,
    quantity, reserved_quantity, updated_at
)
SELECT 
    se.tenant_id,
    se.item_id,
    COALESCE(se.warehouse_id, (SELECT id FROM warehouses WHERE tenant_id = se.tenant_id LIMIT 1)),
    NULL,
    'RAW_MATERIAL',
    SUM(se.quantity),
    SUM(se.quantity - se.available_quantity),
    NOW()
FROM stock_entries se
WHERE se.quantity > 0 OR se.available_quantity > 0
GROUP BY se.tenant_id, se.item_id, se.warehouse_id;

-- Step 7: Verify cleanup worked
SELECT 'AFTER CLEANUP - Stock should now be correct:' as status;
SELECT 
    i.code,
    i.name,
    COUNT(se.id) as entry_count,
    COUNT(DISTINCT se.metadata->>'grn_reference') as unique_grns,
    SUM(se.quantity) as corrected_qty,
    (SELECT SUM(quantity) FROM inventory_stock WHERE item_id = i.id) as inventory_stock_qty
FROM items i
JOIN stock_entries se ON se.item_id = i.id
GROUP BY i.id, i.code, i.name
ORDER BY SUM(se.quantity) DESC
LIMIT 20;

-- Step 8: Check specific item SEN-TEM-LM61
SELECT 
    'SEN-TEM-LM61 Status:' as check_item,
    i.code,
    SUM(se.quantity) as stock_entries_total,
    SUM(se.available_quantity) as available,
    SUM(se.quantity - se.available_quantity) as used
FROM items i
JOIN stock_entries se ON se.item_id = i.id
WHERE i.code = 'SEN-TEM-LM61'
GROUP BY i.id, i.code;
