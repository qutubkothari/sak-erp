-- =====================================================
-- RECOVER STOCK FROM ADJUSTMENT MOVEMENTS
-- =====================================================

-- 1. Check adjustment movements summary
SELECT 
    'ADJUSTMENT movements' as source,
    COUNT(DISTINCT item_id) as items,
    SUM(quantity) as total_qty
FROM stock_movements
WHERE movement_type = 'ADJUSTMENT';

-- 2. Check items with adjustment movements but no current stock
SELECT 
    i.code,
    i.name,
    i.id as item_id,
    SUM(sm.quantity) as adjustment_total,
    0 as current_stock
FROM stock_movements sm
JOIN items i ON i.id = sm.item_id
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE sm.movement_type = 'ADJUSTMENT'
  AND se.id IS NULL
GROUP BY i.id, i.code, i.name
HAVING SUM(sm.quantity) > 0
ORDER BY SUM(sm.quantity) DESC
LIMIT 50;

-- 3. Count items recoverable from adjustments
SELECT 
    'Items from ADJUSTMENT movements' as status,
    COUNT(DISTINCT sm.item_id) as items,
    SUM(sm.quantity) as total_qty
FROM stock_movements sm
LEFT JOIN stock_entries se ON se.item_id = sm.item_id
WHERE sm.movement_type = 'ADJUSTMENT'
  AND se.id IS NULL;

-- 4. Get warehouse info from movements
SELECT DISTINCT
    COALESCE(sm.to_warehouse_id, sm.from_warehouse_id) as warehouse_id,
    COUNT(DISTINCT sm.item_id) as items_count,
    SUM(sm.quantity) as total_qty
FROM stock_movements sm
LEFT JOIN stock_entries se ON se.item_id = sm.item_id
WHERE sm.movement_type = 'ADJUSTMENT'
  AND se.id IS NULL
GROUP BY COALESCE(sm.to_warehouse_id, sm.from_warehouse_id)
ORDER BY total_qty DESC;

-- 5. Create stock_entries from ADJUSTMENT movements
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
SELECT 
    i.tenant_id,
    i.id,
    COALESCE(
        sm.to_warehouse_id,
        sm.from_warehouse_id,
        (SELECT id FROM warehouses WHERE tenant_id = i.tenant_id LIMIT 1)
    ),
    SUM(sm.quantity),
    SUM(sm.quantity),
    0,
    0,
    NULL,
    jsonb_build_object(
        'source', 'stock_movement_adjustment',
        'movement_count', COUNT(sm.id),
        'movement_ids', ARRAY_AGG(sm.id),
        'recovered_at', NOW()
    ),
    MAX(sm.movement_date)
FROM stock_movements sm
JOIN items i ON i.id = sm.item_id
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE sm.movement_type = 'ADJUSTMENT'
  AND se.id IS NULL  -- Only items without stock
GROUP BY i.tenant_id, i.id, sm.to_warehouse_id, sm.from_warehouse_id;

-- 6. Also check for positive movements from other types that might be missing
-- (GRN_RECEIPT that didn't create stock_entries properly)
INSERT INTO stock_entries (
    tenant_id,
    item_id,
    warehouse_id,
    quantity,
    available_quantity,
    metadata,
    created_at
)
SELECT 
    i.tenant_id,
    i.id,
    COALESCE(sm.to_warehouse_id, (SELECT id FROM warehouses LIMIT 1)),
    SUM(sm.quantity),
    SUM(sm.quantity),
    jsonb_build_object(
        'source', 'stock_movement_grn',
        'movement_type', sm.movement_type,
        'recovered_at', NOW()
    ),
    MAX(sm.movement_date)
FROM stock_movements sm
JOIN items i ON i.id = sm.item_id
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE sm.movement_type = 'GRN_RECEIPT'
  AND sm.quantity > 0
  AND se.id IS NULL
GROUP BY i.tenant_id, i.id, sm.to_warehouse_id
HAVING SUM(sm.quantity) > 0;

-- 7. Rebuild inventory_stock
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

-- 8. Final verification
SELECT 
    'FINAL STATE' as status,
    COUNT(DISTINCT item_id) as items_with_stock,
    SUM(quantity) as total_qty,
    SUM(available_quantity) as total_available
FROM inventory_stock;

-- 9. Source breakdown
SELECT 
    COALESCE(se.metadata->>'source', 'original_backup') as source,
    COUNT(DISTINCT se.item_id) as items,
    SUM(se.quantity) as total_qty
FROM stock_entries se
WHERE COALESCE(se.quantity,0) > 0 OR COALESCE(se.available_quantity,0) > 0
GROUP BY COALESCE(se.metadata->>'source', 'original_backup')
ORDER BY total_qty DESC;
