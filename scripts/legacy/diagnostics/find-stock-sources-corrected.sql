-- =====================================================
-- FIND MORE STOCK DATA SOURCES (Corrected)
-- =====================================================

-- 1. Check older backup from January 2026
SELECT 
    'Jan 2026 backup' as source,
    COUNT(DISTINCT item_id) as items,
    SUM(quantity) as total_qty,
    SUM(available_quantity) as total_available
FROM stock_entries_backup_2026_01_10
WHERE COALESCE(quantity, 0) > 0 OR COALESCE(available_quantity, 0) > 0;

-- 2. Check GRN items schema first
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'grn_items'
ORDER BY ordinal_position;

-- 3. Check grns table for received quantities
SELECT 
    'GRNs' as source,
    COUNT(*) as grn_count,
    SUM(total_items) as total_items
FROM grns
WHERE status = 'COMPLETED' OR status = 'APPROVED';

-- 4. Check stock_movements (may have the actual transactions)
SELECT 
    'Stock movements' as source,
    COUNT(DISTINCT item_id) as items,
    SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END) as total_positive,
    SUM(CASE WHEN quantity < 0 THEN quantity ELSE 0 END) as total_negative
FROM stock_movements
WHERE quantity IS NOT NULL;

-- 5. Check stock_adjustments
SELECT 
    'Stock adjustments' as source,
    COUNT(DISTINCT item_id) as items,
    SUM(adjusted_quantity) as total_adjusted
FROM stock_adjustments
WHERE COALESCE(adjusted_quantity, 0) != 0;

-- 6. Check UID inventory (if applicable)
SELECT 
    'UIDs' as source,
    COUNT(DISTINCT entity_id) as items,
    COUNT(*) as total_uids
FROM uids
WHERE status IN ('AVAILABLE', 'IN_STOCK', 'GOOD');
