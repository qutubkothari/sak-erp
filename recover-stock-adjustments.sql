-- =====================================================
-- RECOVER STOCK FROM ADJUSTMENTS
-- =====================================================

-- 1. Check stock_adjustments table
SELECT 
    COUNT(*) as total_adjustments,
    COUNT(DISTINCT item_id) as items_adjusted,
    SUM(adjusted_quantity) as total_adjusted_qty
FROM stock_adjustments
WHERE COALESCE(adjusted_quantity, 0) != 0;

-- 2. Check items with adjustments but no current stock
SELECT 
    i.code,
    i.name,
    i.id as item_id,
    SUM(sa.adjusted_quantity) as adjustment_total,
    0 as current_stock
FROM stock_adjustments sa
JOIN items i ON i.id = sa.item_id
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE se.id IS NULL
GROUP BY i.id, i.code, i.name
HAVING SUM(sa.adjusted_quantity) > 0
ORDER BY SUM(sa.adjusted_quantity) DESC
LIMIT 50;

-- 3. Total items recoverable from adjustments
SELECT 
    COUNT(DISTINCT sa.item_id) as items_from_adjustments,
    SUM(sa.adjusted_quantity) as total_qty_from_adjustments
FROM stock_adjustments sa
LEFT JOIN stock_entries se ON se.item_id = sa.item_id
WHERE se.id IS NULL
  AND COALESCE(sa.adjusted_quantity, 0) > 0;

-- 4. Get warehouse info for adjustments
SELECT DISTINCT
    sa.warehouse_id,
    w.name as warehouse_name,
    COUNT(DISTINCT sa.item_id) as items_count,
    SUM(sa.adjusted_quantity) as total_qty
FROM stock_adjustments sa
LEFT JOIN warehouses w ON w.id = sa.warehouse_id
WHERE COALESCE(sa.adjusted_quantity, 0) > 0
GROUP BY sa.warehouse_id, w.name
ORDER BY total_qty DESC;

-- 5. Create stock_entries from adjustments for missing items
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
    COALESCE(sa.warehouse_id, (SELECT id FROM warehouses WHERE tenant_id = i.tenant_id LIMIT 1)),
    SUM(sa.adjusted_quantity),
    SUM(sa.adjusted_quantity),
    0,
    0,
    NULL,
    jsonb_build_object(
        'source', 'stock_adjustment_recovery',
        'adjustment_ids', ARRAY_AGG(sa.id),
        'adjustment_dates', ARRAY_AGG(sa.adjustment_date),
        'reasons', ARRAY_AGG(sa.reason),
        'recovered_at', NOW()
    ),
    MAX(sa.adjustment_date)
FROM stock_adjustments sa
JOIN items i ON i.id = sa.item_id
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE se.id IS NULL  -- Only items without current stock entries
  AND COALESCE(sa.adjusted_quantity, 0) > 0
GROUP BY i.tenant_id, i.id, sa.warehouse_id;

-- 6. Rebuild inventory_stock after adjustment recovery
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

-- 7. Verify recovery
SELECT 
    'AFTER ADJUSTMENT RECOVERY' as status,
    COUNT(DISTINCT item_id) as items_with_stock,
    SUM(quantity) as total_qty,
    SUM(available_quantity) as total_available
FROM inventory_stock;

-- 8. Check coverage
SELECT 
    COUNT(*) FILTER (WHERE inv.item_id IS NULL) as still_missing,
    COUNT(*) FILTER (WHERE COALESCE(inv.available_quantity, 0) = 0) as still_zero,
    COUNT(*) as total_items
FROM items i
LEFT JOIN inventory_stock inv ON inv.item_id = i.id
WHERE i.is_active = true;
