-- Check inventory stock issues for the affected items

-- 1. Check stock for DIO-SMD-PNJM7 (should have quantity but shows 0)
SELECT 
    'DIO-SMD-PNJM7 Stock' as section,
    i.code,
    i.name,
    inv.quantity,
    inv.available_quantity,
    inv.reserved_quantity,
    inv.reorder_point,
    inv.updated_at
FROM items i
LEFT JOIN inventory_stock inv ON i.id = inv.item_id
WHERE i.code = 'DIO-SMD-PNJM7';

-- 2. Check stock for RAD-TRR-QX71W915 (shows 35 instead of 7)
SELECT 
    'QX71W915 Stock' as section,
    i.code,
    i.name,
    inv.quantity,
    inv.available_quantity,
    inv.reserved_quantity,
    inv.reorder_point,
    inv.updated_at
FROM items i
LEFT JOIN inventory_stock inv ON i.id = inv.item_id
WHERE i.code = 'RAD-TRR-QX71W915';

-- 3. Check stock for RAD-TRR-R9MI1W915 (shows 35 instead of 7)
SELECT 
    'R9MI1W915 Stock' as section,
    i.code,
    i.name,
    inv.quantity,
    inv.available_quantity,
    inv.reserved_quantity,
    inv.reorder_point,
    inv.updated_at
FROM items i
LEFT JOIN inventory_stock inv ON i.id = inv.item_id
WHERE i.code = 'RAD-TRR-R9MI1W915';

-- 4. Check if there are multiple stock entries (duplicates)
SELECT 
    'Duplicate Stock Entries' as section,
    i.code,
    COUNT(*) as stock_entry_count,
    SUM(inv.quantity) as total_qty_sum
FROM inventory_stock inv
JOIN items i ON inv.item_id = i.id
WHERE i.code IN ('DIO-SMD-PNJM7', 'RAD-TRR-QX71W915', 'RAD-TRR-R9MI1W915')
GROUP BY i.code
ORDER BY i.code;

-- 5. Show all stock entries for these items
SELECT 
    'All Stock Entries' as section,
    i.code,
    inv.id as stock_entry_id,
    inv.quantity,
    inv.available_quantity,
    inv.warehouse_id,
    inv.created_at,
    inv.updated_at
FROM inventory_stock inv
JOIN items i ON inv.item_id = i.id
WHERE i.code IN ('DIO-SMD-PNJM7', 'RAD-TRR-QX71W915', 'RAD-TRR-R9MI1W915')
ORDER BY i.code, inv.created_at;

-- 6. Check GRN references for these items
SELECT 
    'GRN History' as section,
    g.grn_number,
    gi.item_code,
    gi.accepted_qty,
    gi.uid_count,
    g.created_at,
    g.status
FROM grn_items gi
JOIN grns g ON gi.grn_id = g.id
WHERE gi.item_code IN ('DIO-SMD-PNJM7', 'RAD-TRR-QX71W915', 'RAD-TRR-R9MI1W915')
ORDER BY g.grn_number, gi.item_code;
