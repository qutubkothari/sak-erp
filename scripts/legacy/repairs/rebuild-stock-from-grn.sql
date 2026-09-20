-- =====================================================
-- REBUILD STOCK FROM GRN DATA FOR MISSING ITEMS
-- =====================================================

-- 1. Check older backup from January 2026
SELECT 
    'Jan 2026 backup' as source,
    COUNT(DISTINCT item_id) as items,
    SUM(quantity) as total_qty,
    SUM(available_quantity) as total_available
FROM stock_entries_backup_2026_01_10
WHERE COALESCE(quantity, 0) > 0 OR COALESCE(available_quantity, 0) > 0;

-- 2. Calculate stock from GRN items for items missing stock
SELECT 
    gi.item_code,
    i.name,
    i.id as item_id,
    SUM(gi.received_qty) as total_received,
    0 as current_stock_in_entries
FROM grn_items gi
JOIN items i ON i.code = gi.item_code
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE COALESCE(gi.received_qty, 0) > 0
  AND se.id IS NULL  -- Not in current stock_entries
GROUP BY gi.item_code, i.name, i.id
ORDER BY SUM(gi.received_qty) DESC
LIMIT 50;

-- 3. Get total items that can be recovered from GRN
SELECT 
    COUNT(DISTINCT gi.item_code) as items_from_grn,
    SUM(gi.received_qty) as total_qty_from_grn
FROM grn_items gi
JOIN items i ON i.code = gi.item_code
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE COALESCE(gi.received_qty, 0) > 0
  AND se.id IS NULL;

-- 4. Get warehouse info for GRN-based stock
SELECT 
    g.warehouse_id,
    w.name as warehouse_name,
    COUNT(DISTINCT gi.item_code) as items_count,
    SUM(gi.received_qty) as total_qty
FROM grns g
JOIN grn_items gi ON gi.grn_id = g.id
JOIN warehouses w ON w.id = g.warehouse_id
WHERE g.status IN ('COMPLETED', 'APPROVED', 'VERIFIED')
GROUP BY g.warehouse_id, w.name
ORDER BY total_qty DESC;
