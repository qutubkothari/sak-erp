-- =====================================================
-- FINAL STOCK RECOVERY CHECK
-- =====================================================

-- 1. Check January 2026 backup - may have older items
SELECT 
    'Jan 2026 backup' as source,
    COUNT(DISTINCT item_id) as items,
    SUM(quantity) as total_qty,
    SUM(available_quantity) as total_available
FROM stock_entries_backup_2026_01_10
WHERE COALESCE(quantity, 0) > 0 OR COALESCE(available_quantity, 0) > 0;

-- 2. Check if items missing stock are truly never-had-stock or deleted
SELECT 
    i.code,
    i.name,
    i.created_at,
    CASE 
        WHEN b.item_id IS NOT NULL THEN 'Had stock in June backup'
        WHEN j.item_id IS NOT NULL THEN 'Had stock in Jan backup'
        ELSE 'Never had stock entries'
    END as stock_status
FROM items i
LEFT JOIN (
    SELECT DISTINCT item_id FROM stock_entries_backup_20250602 
    WHERE COALESCE(quantity,0) > 0 OR COALESCE(available_quantity,0) > 0
) b ON b.item_id = i.id
LEFT JOIN (
    SELECT DISTINCT item_id FROM stock_entries_backup_2026_01_10 
    WHERE COALESCE(quantity,0) > 0 OR COALESCE(available_quantity,0) > 0
) j ON j.item_id = i.id
LEFT JOIN stock_entries se ON se.item_id = i.id
WHERE i.is_active = true
  AND se.id IS NULL
ORDER BY 
    CASE WHEN b.item_id IS NOT NULL THEN 1 WHEN j.item_id IS NOT NULL THEN 2 ELSE 3 END,
    i.created_at DESC
LIMIT 100;

-- 3. If Jan backup has different items, restore them
-- Check items in Jan backup but not in current stock_entries
SELECT 
    j.item_id,
    i.code,
    i.name,
    SUM(j.quantity) as jan_qty
FROM stock_entries_backup_2026_01_10 j
JOIN items i ON i.id = j.item_id
LEFT JOIN stock_entries se ON se.item_id = j.item_id
WHERE (COALESCE(j.quantity,0) > 0 OR COALESCE(j.available_quantity,0) > 0)
  AND se.id IS NULL
GROUP BY j.item_id, i.code, i.name
ORDER BY SUM(j.quantity) DESC
LIMIT 50;

-- 4. Summary of what we have
SELECT 
    'Current stock_entries' as source, COUNT(DISTINCT item_id) as items, SUM(quantity) as qty
FROM stock_entries WHERE COALESCE(quantity,0) > 0 OR COALESCE(available_quantity,0) > 0
UNION ALL
SELECT 'June backup', COUNT(DISTINCT item_id), SUM(quantity) 
FROM stock_entries_backup_20250602 WHERE COALESCE(quantity,0) > 0 OR COALESCE(available_quantity,0) > 0
UNION ALL
SELECT 'Jan backup', COUNT(DISTINCT item_id), SUM(quantity) 
FROM stock_entries_backup_2026_01_10 WHERE COALESCE(quantity,0) > 0 OR COALESCE(available_quantity,0) > 0;
