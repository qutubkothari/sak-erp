-- =====================================================
-- FINAL VERIFICATION AFTER RECOVERY
-- =====================================================

-- 1. Final coverage check
SELECT 
    COUNT(*) FILTER (WHERE inv.item_id IS NULL) as items_missing_stock,
    COUNT(*) FILTER (WHERE COALESCE(inv.available_quantity, 0) = 0) as items_zero_available,
    COUNT(*) as total_active_items
FROM items i
LEFT JOIN inventory_stock inv ON inv.item_id = i.id
WHERE i.is_active = true;

-- 2. Source breakdown
SELECT 
    COALESCE(se.metadata->>'source', 'backup_june_02') as source,
    COUNT(DISTINCT se.item_id) as items,
    SUM(se.quantity) as total_qty
FROM stock_entries se
WHERE COALESCE(se.quantity,0) > 0 OR COALESCE(se.available_quantity,0) > 0
GROUP BY COALESCE(se.metadata->>'source', 'backup_june_02')
ORDER BY total_qty DESC;

-- 3. Check specific items that were mentioned
SELECT 
    i.code,
    i.name,
    SUM(inv.quantity) as qty,
    SUM(inv.available_quantity) as available
FROM inventory_stock inv
JOIN items i ON i.id = inv.item_id
WHERE i.code IN ('SEN-TEM-LM61', 'CAB-SCO-1C14/38LENChetan-WhiteBlack', 'ITM-MURATA-5V-10A-BUCK')
GROUP BY i.code, i.name;

-- 4. Items still missing stock that were created before June
SELECT 
    i.code,
    i.name,
    i.created_at,
    NOW() - i.created_at as age
FROM items i
LEFT JOIN inventory_stock inv ON inv.item_id = i.id
WHERE i.is_active = true 
  AND (inv.item_id IS NULL OR COALESCE(inv.quantity, 0) = 0)
  AND i.created_at < '2025-06-01'
ORDER BY i.created_at ASC
LIMIT 20;

-- 5. Summary comparison with backups
SELECT 
    'Current (after recovery)' as source,
    COUNT(DISTINCT item_id) as items,
    SUM(quantity) as total_qty
FROM inventory_stock
UNION ALL
SELECT 'June 02 backup', COUNT(DISTINCT item_id), SUM(quantity)
FROM stock_entries_backup_20250602
WHERE COALESCE(quantity,0) > 0 OR COALESCE(available_quantity,0) > 0
UNION ALL
SELECT 'Difference (should be 0)', 0, 218221.58 - 218123.40;
