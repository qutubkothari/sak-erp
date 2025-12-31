-- Check GRN-2025-12-002 UID issue
-- Expected: 2 items with 30 UIDs total = 60 UIDs
-- Actual: Only 15 UIDs generated for 1 product

-- 1. Get GRN basic info
SELECT 
    'GRN Info' as section,
    id, 
    grn_number, 
    status,
    created_at
FROM grns 
WHERE grn_number = 'GRN-2025-12-002';

-- 2. Get GRN items - what was expected
SELECT 
    'GRN Items - Expected' as section,
    gi.id as grn_item_id,
    gi.item_code,
    gi.item_name,
    gi.received_qty,
    gi.accepted_qty,
    gi.rejected_qty,
    gi.uid_count,
    gi.uid_generated,
    i.id as item_uuid
FROM grn_items gi
LEFT JOIN items i ON gi.item_id = i.id
WHERE gi.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-002')
ORDER BY gi.item_code;

-- 3. Count total UIDs
SELECT 
    'Total UIDs' as section,
    COUNT(*) as total_uids
FROM uid_registry
WHERE grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-002');

-- 4. UIDs per item breakdown
SELECT 
    'UIDs Per Item' as section,
    ur.entity_id,
    i.code as item_code,
    i.name as item_name,
    COUNT(*) as uid_count
FROM uid_registry ur
LEFT JOIN items i ON ur.entity_id = i.id
WHERE ur.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-002')
GROUP BY ur.entity_id, i.code, i.name
ORDER BY uid_count DESC;

-- 5. Compare expected vs actual
SELECT 
    'Expected vs Actual' as section,
    gi.item_code,
    gi.item_name,
    gi.accepted_qty as expected_uids,
    gi.uid_count as recorded_in_grn_items,
    COALESCE(uid_counts.actual, 0) as actual_in_registry,
    CASE 
        WHEN COALESCE(uid_counts.actual, 0) = 0 THEN 'NOT GENERATED'
        WHEN COALESCE(uid_counts.actual, 0) < gi.accepted_qty THEN 'INCOMPLETE'
        WHEN COALESCE(uid_counts.actual, 0) = gi.accepted_qty THEN 'CORRECT'
        ELSE 'TOO MANY'
    END as status
FROM grn_items gi
LEFT JOIN items i ON gi.item_id = i.id
LEFT JOIN (
    SELECT entity_id, COUNT(*) as actual
    FROM uid_registry
    WHERE grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-002')
    GROUP BY entity_id
) uid_counts ON uid_counts.entity_id = i.id
WHERE gi.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-002')
ORDER BY gi.item_code;

-- 6. Show sample UIDs
SELECT 
    'Sample UIDs' as section,
    ur.uid,
    i.code as item_code,
    ur.entity_type,
    ur.created_at
FROM uid_registry ur
LEFT JOIN items i ON ur.entity_id = i.id
WHERE ur.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-002')
ORDER BY ur.created_at
LIMIT 20;
