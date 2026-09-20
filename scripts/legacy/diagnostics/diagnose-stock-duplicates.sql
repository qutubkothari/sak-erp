-- ==========================================
-- 1. CHECK ALL ITEMS WITH DOUBLED STOCK
-- ==========================================
SELECT 
    i.code,
    i.name,
    COUNT(DISTINCT se.id) as stock_entry_count,
    COUNT(DISTINCT se.metadata->>'grn_reference') as unique_grn_refs,
    SUM(se.quantity) as total_stock_entries_qty,
    SUM(se.quantity) - COUNT(DISTINCT se.metadata->>'grn_reference') * 256 as estimated_duplicate_qty
FROM items i
JOIN stock_entries se ON se.item_id = i.id
WHERE i.tenant_id = (SELECT tenant_id FROM items WHERE code = 'SEN-TEM-LM61' LIMIT 1)
GROUP BY i.id, i.code, i.name
HAVING COUNT(DISTINCT se.id) > COUNT(DISTINCT se.metadata->>'grn_reference') + 1
ORDER BY total_stock_entries_qty DESC
LIMIT 50;

-- ==========================================
-- 2. FIND ALL DUPLICATE stock_entries BY GRN REFERENCE
-- ==========================================
SELECT 
    se.metadata->>'grn_reference' as grn_ref,
    se.item_id,
    i.code as item_code,
    se.warehouse_id,
    w.name as warehouse_name,
    se.batch_number,
    COUNT(*) as duplicate_count,
    STRING_AGG(se.id::text, ', ' ORDER BY se.created_at) as entry_ids,
    STRING_AGG(se.quantity::text, ', ' ORDER BY se.created_at) as quantities,
    MIN(se.created_at) as first_created,
    MAX(se.created_at) as last_created
FROM stock_entries se
JOIN items i ON i.id = se.item_id
LEFT JOIN warehouses w ON w.id = se.warehouse_id
WHERE se.metadata->>'grn_reference' IS NOT NULL
GROUP BY se.metadata->>'grn_reference', se.item_id, i.code, se.warehouse_id, w.name, se.batch_number
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 100;

-- ==========================================
-- 3. FIND stock_entries CREATED BY RECONCILE PROCESS
-- ==========================================
SELECT 
    se.id,
    se.item_id,
    i.code as item_code,
    se.quantity,
    se.available_quantity,
    se.metadata,
    se.created_at,
    se.created_from
FROM stock_entries se
JOIN items i ON i.id = se.item_id
WHERE 
    se.metadata->>'notes' ILIKE '%reconcile%' 
    OR se.metadata->>'source' = 'reconcile'
    OR se.created_from ILIKE '%reconcile%'
    OR se.metadata->>'grn_reference' IS NULL 
ORDER BY se.created_at DESC
LIMIT 100;

-- ==========================================
-- 4. CHECK IF UID GENERATION IS CREATING DUPLICATES
-- ==========================================
SELECT 
    se.metadata->>'uid_reference' as uid_ref,
    se.metadata->>'grn_reference' as grn_ref,
    se.item_id,
    i.code,
    COUNT(*) as count
FROM stock_entries se
JOIN items i ON i.id = se.item_id
WHERE se.metadata->>'uid_reference' IS NOT NULL
GROUP BY se.metadata->>'uid_reference', se.metadata->>'grn_reference', se.item_id, i.code
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 50;

-- ==========================================
-- 5. CHECK FOR stock_entries WITHOUT GRN REFERENCE (potential synthetic entries)
-- ==========================================
SELECT 
    i.code,
    i.name,
    se.id,
    se.quantity,
    se.metadata,
    se.created_at,
    se.created_from
FROM stock_entries se
JOIN items i ON i.id = se.item_id
WHERE se.metadata->>'grn_reference' IS NULL
  AND se.metadata->>'uid_reference' IS NULL
ORDER BY se.created_at DESC
LIMIT 100;
