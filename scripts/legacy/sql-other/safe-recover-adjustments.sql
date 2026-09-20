-- =====================================================
-- SAFE RECOVERY: Adjustments First, Preserve GRN Stock
-- =====================================================

-- STEP 1: Check current state BEFORE any changes
SELECT 
    'BEFORE recovery' as status,
    COUNT(DISTINCT item_id) as items_with_stock,
    SUM(quantity) as total_qty,
    SUM(available_quantity) as total_available
FROM stock_entries
WHERE COALESCE(quantity,0) > 0 OR COALESCE(available_quantity,0) > 0;

-- STEP 2: Check how many items can be recovered from adjustments (that don't have stock yet)
SELECT 
    'Adjustments to recover' as status,
    COUNT(DISTINCT sa.item_id) as items,
    SUM(sa.adjusted_quantity) as total_qty
FROM stock_adjustments sa
LEFT JOIN stock_entries se ON se.item_id = sa.item_id
WHERE se.id IS NULL 
  AND COALESCE(sa.adjusted_quantity, 0) > 0;

-- STEP 3: Create stock_entries ONLY for items that don't have any stock yet
-- This preserves existing GRN stock entries
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
        'adjustment_count', COUNT(sa.id),
        'recovered_at', NOW()
    ),
    MAX(sa.adjustment_date)
FROM stock_adjustments sa
JOIN items i ON i.id = sa.item_id
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE se.id IS NULL  -- ONLY items without existing stock entries
  AND COALESCE(sa.adjusted_quantity, 0) > 0
GROUP BY i.tenant_id, i.id, sa.warehouse_id;

-- STEP 4: Verify after adjustment recovery
SELECT 
    'AFTER adjustment recovery' as status,
    COUNT(DISTINCT item_id) as items_with_stock,
    SUM(quantity) as total_qty,
    SUM(available_quantity) as total_available
FROM stock_entries
WHERE COALESCE(quantity,0) > 0 OR COALESCE(available_quantity,0) > 0;

-- STEP 5: Check for any GRN items that might be missing stock
-- (This ensures GRN-based stock is preserved)
SELECT 
    'GRN items check' as status,
    COUNT(DISTINCT gi.item_code) as items_from_grn,
    SUM(gi.received_qty) as total_grn_qty
FROM grn_items gi
JOIN items i ON i.code = gi.item_code
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE COALESCE(gi.received_qty, 0) > 0
  AND se.id IS NULL;

-- STEP 6: If there are GRN items without stock, create entries for them
-- (This handles edge cases where GRN stock wasn't captured)
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
    COALESCE(g.warehouse_id, (SELECT id FROM warehouses WHERE tenant_id = i.tenant_id LIMIT 1)),
    SUM(gi.received_qty),
    SUM(gi.received_qty),
    0,
    0,
    NULL,
    jsonb_build_object(
        'source', 'grn_recovery',
        'grn_count', COUNT(DISTINCT g.id),
        'recovered_at', NOW()
    ),
    MAX(g.receipt_date)
FROM grn_items gi
JOIN items i ON i.code = gi.item_code
JOIN grns g ON g.id = gi.grn_id
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE se.id IS NULL  -- Only items without existing stock
  AND COALESCE(gi.received_qty, 0) > 0
  AND g.status IN ('COMPLETED', 'APPROVED', 'VERIFIED')
GROUP BY i.tenant_id, i.id, g.warehouse_id;

-- STEP 7: Final rebuild of inventory_stock from ALL sources
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

-- STEP 8: Final verification
SELECT 
    'FINAL STATE' as status,
    COUNT(DISTINCT item_id) as items_with_stock,
    SUM(quantity) as total_qty,
    SUM(available_quantity) as total_available
FROM inventory_stock;

-- STEP 9: Check coverage
SELECT 
    COUNT(*) FILTER (WHERE inv.item_id IS NULL) as still_missing,
    COUNT(*) FILTER (WHERE COALESCE(inv.available_quantity, 0) = 0) as still_zero,
    COUNT(*) as total_items
FROM items i
LEFT JOIN inventory_stock inv ON inv.item_id = i.id
WHERE i.is_active = true;

-- STEP 10: Show source breakdown
SELECT 
    COALESCE(se.metadata->>'source', 'original_backup') as source,
    COUNT(DISTINCT se.item_id) as items,
    SUM(se.quantity) as total_qty
FROM stock_entries se
WHERE COALESCE(se.quantity,0) > 0 OR COALESCE(se.available_quantity,0) > 0
GROUP BY COALESCE(se.metadata->>'source', 'original_backup')
ORDER BY total_qty DESC;
