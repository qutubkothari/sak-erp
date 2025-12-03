-- Delete duplicate UIDs for GRN-2025-12-001
-- Keep only the first 7 UIDs per item (sorted by created_at)

BEGIN;

-- Show current state
SELECT 
    i.code as item_code,
    COUNT(*) as current_uid_count,
    MIN(gi.accepted_qty) as expected_count
FROM uid_registry ur
JOIN items i ON ur.entity_id = i.id
JOIN grn_items gi ON gi.item_id = i.id AND gi.grn_id = ur.grn_id
WHERE ur.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001')
GROUP BY i.code;

-- Delete excess UIDs for RAD-TRR-QX71W915 (keep first 7)
DELETE FROM uid_registry
WHERE id IN (
    SELECT id FROM (
        SELECT 
            ur.id,
            ROW_NUMBER() OVER (PARTITION BY ur.entity_id ORDER BY ur.created_at) as rn
        FROM uid_registry ur
        JOIN items i ON ur.entity_id = i.id
        WHERE ur.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001')
            AND i.code = 'RAD-TRR-QX71W915'
    ) ranked
    WHERE rn > 7
);

-- Delete excess UIDs for RAD-TRR-R9MI1W915 (keep first 7)
DELETE FROM uid_registry
WHERE id IN (
    SELECT id FROM (
        SELECT 
            ur.id,
            ROW_NUMBER() OVER (PARTITION BY ur.entity_id ORDER BY ur.created_at) as rn
        FROM uid_registry ur
        JOIN items i ON ur.entity_id = i.id
        WHERE ur.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001')
            AND i.code = 'RAD-TRR-R9MI1W915'
    ) ranked
    WHERE rn > 7
);

-- Update grn_items uid_count to match reality
UPDATE grn_items gi
SET uid_count = 7
WHERE grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001')
    AND accepted_qty = 7;

-- Verify final state
SELECT 
    i.code as item_code,
    gi.accepted_qty as expected,
    gi.uid_count as recorded,
    COUNT(ur.uid) as actual
FROM grn_items gi
JOIN items i ON gi.item_id = i.id
LEFT JOIN uid_registry ur ON ur.grn_id = gi.grn_id AND ur.entity_id = i.id
WHERE gi.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001')
GROUP BY i.code, gi.accepted_qty, gi.uid_count;

COMMIT;
-- If something looks wrong, run ROLLBACK; instead
