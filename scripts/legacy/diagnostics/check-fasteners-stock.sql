-- =====================================================
-- CHECK FASTENERS ITEMS THAT HAD STOCK
-- =====================================================

-- 1. Check if these items exist and when created
SELECT 
    i.code,
    i.name,
    i.id,
    i.created_at,
    i.tenant_id
FROM items i
WHERE i.code IN (
    'FAS-BLT-CSK-4M8M-PH-304SS',
    'FAS-BLT-CSK-3M20M-PH-304SS',
    'FAS-BLT-ALN-4M10M-HX-304SS',
    'FAS-BLT-ALN-4M20M-HX-304SS',
    'FAS-NUT-4M-HEX-304SS'
);

-- 2. Check current stock for these items
SELECT 
    i.code,
    i.name,
    COALESCE(SUM(inv.quantity), 0) as current_qty,
    COALESCE(SUM(inv.available_quantity), 0) as available
FROM items i
LEFT JOIN inventory_stock inv ON inv.item_id = i.id
WHERE i.code IN (
    'FAS-BLT-CSK-4M8M-PH-304SS',
    'FAS-BLT-CSK-3M20M-PH-304SS',
    'FAS-BLT-ALN-4M10M-HX-304SS',
    'FAS-BLT-ALN-4M20M-HX-304SS',
    'FAS-NUT-4M-HEX-304SS'
)
GROUP BY i.id, i.code, i.name;

-- 3. Check stock_entries for these items
SELECT 
    i.code,
    se.id as entry_id,
    se.quantity,
    se.available_quantity,
    se.metadata,
    se.created_at
FROM items i
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE i.code IN (
    'FAS-BLT-CSK-4M8M-PH-304SS',
    'FAS-BLT-CSK-3M20M-PH-304SS',
    'FAS-BLT-ALN-4M10M-HX-304SS',
    'FAS-BLT-ALN-4M20M-HX-304SS',
    'FAS-NUT-4M-HEX-304SS'
)
ORDER BY i.code, se.created_at;

-- 4. Check backups for these items
SELECT 
    i.code,
    b.id as backup_entry_id,
    b.quantity,
    b.available_quantity,
    b.metadata,
    b.created_at
FROM items i
LEFT JOIN stock_entries_backup_20250602 b ON b.item_id = i.id
WHERE i.code IN (
    'FAS-BLT-CSK-4M8M-PH-304SS',
    'FAS-BLT-CSK-3M20M-PH-304SS',
    'FAS-BLT-ALN-4M10M-HX-304SS',
    'FAS-BLT-ALN-4M20M-HX-304SS',
    'FAS-NUT-4M-HEX-304SS'
)
ORDER BY i.code, b.created_at;

-- 5. Check stock_movements for these items
SELECT 
    i.code,
    sm.movement_type,
    sm.quantity,
    sm.movement_date,
    sm.reference_number
FROM items i
LEFT JOIN stock_movements sm ON sm.item_id = i.id
WHERE i.code IN (
    'FAS-BLT-CSK-4M8M-PH-304SS',
    'FAS-BLT-CSK-3M20M-PH-304SS',
    'FAS-BLT-ALN-4M10M-HX-304SS',
    'FAS-BLT-ALN-4M20M-HX-304SS',
    'FAS-NUT-4M-HEX-304SS'
)
ORDER BY i.code, sm.movement_date;

-- 6. Check if they have GRN history
SELECT 
    i.code,
    gi.received_qty,
    g.grn_number,
    g.receipt_date
FROM items i
LEFT JOIN grn_items gi ON gi.item_code = i.code
LEFT JOIN grns g ON g.id = gi.grn_id
WHERE i.code IN (
    'FAS-BLT-CSK-4M8M-PH-304SS',
    'FAS-BLT-CSK-3M20M-PH-304SS',
    'FAS-BLT-ALN-4M10M-HX-304SS',
    'FAS-BLT-ALN-4M20M-HX-304SS',
    'FAS-NUT-4M-HEX-304SS'
)
ORDER BY i.code, g.receipt_date;
