-- =====================================================
-- FIND WHAT'S STILL MISSING FROM BACKUP
-- =====================================================

-- 1. Check how many unique items are in backup with stock
SELECT 
    'Backup unique items' as source,
    COUNT(DISTINCT b.item_id) as items,
    SUM(b.quantity) as total_qty
FROM stock_entries_backup_20250602 b
WHERE COALESCE(b.quantity, 0) > 0 OR COALESCE(b.available_quantity, 0) > 0;

-- 2. Check how many are already restored
SELECT 
    'Current stock (restored)' as source,
    COUNT(DISTINCT item_id) as items,
    SUM(quantity) as total_qty
FROM stock_entries
WHERE COALESCE(quantity, 0) > 0 OR COALESCE(available_quantity, 0) > 0;

-- 3. Find specific items in backup but missing from current
SELECT 
    i.code,
    i.name,
    SUM(b.quantity) as backup_qty,
    0 as current_qty,
    COUNT(b.id) as backup_entries
FROM stock_entries_backup_20250602 b
JOIN items i ON i.id = b.item_id
LEFT JOIN stock_entries se ON se.item_id = b.item_id
WHERE (COALESCE(b.quantity, 0) > 0 OR COALESCE(b.available_quantity, 0) > 0)
  AND se.id IS NULL
GROUP BY i.id, i.code, i.name
ORDER BY SUM(b.quantity) DESC
LIMIT 50;

-- 4. Count total missing
SELECT 
    'Items in backup but missing' as status,
    COUNT(DISTINCT b.item_id) as items,
    SUM(b.quantity) as qty
FROM stock_entries_backup_20250602 b
LEFT JOIN stock_entries se ON se.item_id = b.item_id
WHERE (COALESCE(b.quantity, 0) > 0 OR COALESCE(b.available_quantity, 0) > 0)
  AND se.id IS NULL;

-- 5. Check if FAS-BLT-ALN items are in backup
SELECT 
    i.code,
    b.id,
    b.quantity,
    b.available_quantity,
    b.warehouse_id
FROM items i
LEFT JOIN stock_entries_backup_20250602 b ON b.item_id = i.id
WHERE i.code LIKE 'FAS-BLT-ALN%'
ORDER BY i.code;
