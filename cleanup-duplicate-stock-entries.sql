-- Clean up duplicate stock entries for GRN-2025-12-001
-- Keep only the FIRST entry for each item, delete the rest

-- Show current duplicates
SELECT 
    i.code,
    COUNT(*) as entry_count,
    SUM(se.quantity) as total_qty_shown,
    MIN(se.quantity) as correct_qty
FROM stock_entries se
JOIN items i ON se.item_id = i.id
WHERE i.code IN ('RAD-TRR-QX71W915', 'RAD-TRR-R9MI1W915')
    AND se.metadata->>'grn_reference' = 'GRN-2025-12-001'
GROUP BY i.code;

-- Delete duplicate entries for RAD-TRR-QX71W915 (keep first, delete 4 duplicates)
WITH ranked AS (
    SELECT 
        se.id,
        ROW_NUMBER() OVER (PARTITION BY se.item_id ORDER BY se.created_at) as rn
    FROM stock_entries se
    JOIN items i ON se.item_id = i.id
    WHERE i.code = 'RAD-TRR-QX71W915'
        AND se.metadata->>'grn_reference' = 'GRN-2025-12-001'
)
DELETE FROM stock_entries
WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
RETURNING id, quantity;

-- Delete duplicate entries for RAD-TRR-R9MI1W915 (keep first, delete 4 duplicates)
WITH ranked AS (
    SELECT 
        se.id,
        ROW_NUMBER() OVER (PARTITION BY se.item_id ORDER BY se.created_at) as rn
    FROM stock_entries se
    JOIN items i ON se.item_id = i.id
    WHERE i.code = 'RAD-TRR-R9MI1W915'
        AND se.metadata->>'grn_reference' = 'GRN-2025-12-001'
)
DELETE FROM stock_entries
WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
RETURNING id, quantity;

-- Verify final state
SELECT 
    'After Cleanup' as status,
    i.code,
    COUNT(*) as entry_count,
    SUM(se.quantity) as total_qty
FROM stock_entries se
JOIN items i ON se.item_id = i.id
WHERE i.code IN ('RAD-TRR-QX71W915', 'RAD-TRR-R9MI1W915')
    AND se.metadata->>'grn_reference' = 'GRN-2025-12-001'
GROUP BY i.code;
