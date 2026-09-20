-- =====================================================
-- RECOVER STOCK THAT WAS ONLY IN INVENTORY_STOCK
-- =====================================================

-- 1. Check if FAS-BLT-ALN items have GRN history
SELECT 
    i.code,
    i.name,
    i.id,
    gi.received_qty,
    g.grn_number,
    g.receipt_date,
    g.warehouse_id
FROM items i
LEFT JOIN grn_items gi ON gi.item_code = i.code
LEFT JOIN grns g ON g.id = gi.grn_id
WHERE i.code IN (
    'FAS-BLT-ALN-4M10M-HX-304SS',
    'FAS-BLT-ALN-4M20M-HX-304SS'
)
ORDER BY i.code, g.receipt_date;

-- 2. Check stock_movements for these items
SELECT 
    i.code,
    sm.movement_type,
    sm.quantity,
    sm.movement_date,
    sm.to_warehouse_id,
    sm.from_warehouse_id
FROM items i
LEFT JOIN stock_movements sm ON sm.item_id = i.id
WHERE i.code IN (
    'FAS-BLT-ALN-4M10M-HX-304SS',
    'FAS-BLT-ALN-4M20M-HX-304SS'
)
ORDER BY i.code, sm.movement_date;

-- 3. Check if there's an older inventory_stock backup
SELECT table_name
FROM information_schema.tables
WHERE table_name ILIKE '%inventory%backup%' OR table_name ILIKE '%inventory%stock%backup%'
ORDER BY table_name;

-- 4. Find ALL items with no stock but should have based on history
SELECT 
    i.code,
    i.name,
    EXISTS(SELECT 1 FROM grn_items gi WHERE gi.item_code = i.code) as has_grn,
    EXISTS(SELECT 1 FROM stock_movements sm WHERE sm.item_id = i.id AND sm.quantity > 0) as has_positive_movements,
    0 as current_stock
FROM items i
LEFT JOIN inventory_stock inv ON inv.item_id = i.id
WHERE (inv.item_id IS NULL OR COALESCE(inv.quantity, 0) = 0)
  AND i.is_active = true
  AND (
      EXISTS(SELECT 1 FROM grn_items gi WHERE gi.item_code = i.code AND COALESCE(gi.received_qty, 0) > 0)
      OR EXISTS(SELECT 1 FROM stock_movements sm WHERE sm.item_id = i.id AND sm.quantity > 0)
  )
ORDER BY i.code
LIMIT 50;

-- 5. Create stock_entries from GRN history for items with no stock
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
    COALESCE(gi.unit_price, 0),
    NULL,
    jsonb_build_object(
        'source', 'grn_receipt_recovery',
        'grn_count', COUNT(DISTINCT g.id),
        'recovered_at', NOW()
    ),
    MAX(g.receipt_date)
FROM items i
JOIN grn_items gi ON gi.item_code = i.code
JOIN grns g ON g.id = gi.grn_id
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE COALESCE(gi.received_qty, 0) > 0
  AND g.status IN ('COMPLETED', 'APPROVED', 'VERIFIED')
  AND se.id IS NULL  -- Only items without stock
GROUP BY i.tenant_id, i.id, g.warehouse_id;

-- 6. Also check stock_movements for positive entries (transfers, receipts)
INSERT INTO stock_entries (
    tenant_id,
    item_id,
    warehouse_id,
    quantity,
    available_quantity,
    allocated_quantity,
    unit_price,
    metadata,
    created_at
)
SELECT 
    i.tenant_id,
    i.id,
    COALESCE(sm.to_warehouse_id, (SELECT id FROM warehouses WHERE tenant_id = i.tenant_id LIMIT 1)),
    SUM(sm.quantity),
    SUM(sm.quantity),
    0,
    0,
    jsonb_build_object(
        'source', 'movement_recovery',
        'movement_types', ARRAY_AGG(DISTINCT sm.movement_type),
        'recovered_at', NOW()
    ),
    MAX(sm.movement_date)
FROM items i
JOIN stock_movements sm ON sm.item_id = i.id
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE sm.quantity > 0
  AND se.id IS NULL
GROUP BY i.tenant_id, i.id, sm.to_warehouse_id;

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
    'AFTER GRN/MOVEMENT RECOVERY' as status,
    COUNT(DISTINCT item_id) as items_with_stock,
    SUM(quantity) as total_qty,
    SUM(available_quantity) as total_available
FROM inventory_stock;
