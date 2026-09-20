-- =====================================================
-- FIND MORE STOCK DATA SOURCES
-- =====================================================

-- 1. Check older backup (2026_01_10) for more stock data
SELECT 
    'Older backup (Jan 2026)' as source,
    COUNT(DISTINCT item_id) as items,
    SUM(quantity) as total_qty
FROM stock_entries_backup_2026_01_10
WHERE COALESCE(quantity, 0) > 0 OR COALESCE(available_quantity, 0) > 0;

-- 2. Check GRN items - these should have created stock
SELECT 
    'GRN Items' as source,
    COUNT(DISTINCT item_id) as items,
    SUM(received_quantity) as total_received
FROM grn_items
WHERE COALESCE(received_quantity, 0) > 0;

-- 3. Check stock_adjustments table
SELECT 
    'Stock Adjustments' as source,
    COUNT(DISTINCT item_id) as items,
    SUM(adjusted_quantity) as total_adjusted
FROM stock_adjustments
WHERE COALESCE(adjusted_quantity, 0) != 0;

-- 4. Check which items are missing stock but have GRN history
SELECT 
    i.code,
    i.name,
    SUM(gi.received_quantity) as total_grn_received,
    0 as current_stock
FROM items i
JOIN grn_items gi ON gi.item_id = i.id
LEFT JOIN inventory_stock inv ON inv.item_id = i.id
WHERE inv.item_id IS NULL OR COALESCE(inv.quantity, 0) = 0
GROUP BY i.id, i.code, i.name
HAVING SUM(gi.received_quantity) > 0
ORDER BY SUM(gi.received_quantity) DESC
LIMIT 50;

-- 5. Check items missing stock with no GRN history (might need zero stock)
SELECT 
    i.code,
    i.name,
    i.created_at
FROM items i
LEFT JOIN inventory_stock inv ON inv.item_id = i.id
LEFT JOIN grn_items gi ON gi.item_id = i.id
WHERE (inv.item_id IS NULL OR COALESCE(inv.quantity, 0) = 0)
  AND gi.id IS NULL
  AND i.is_active = true
ORDER BY i.created_at DESC
LIMIT 50;
