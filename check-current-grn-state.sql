-- Check current state of GRN-2025-12-001 after potential deletion

-- 1. Does this GRN exist?
SELECT 
    'GRN Exists' as check_type,
    id, 
    grn_number, 
    status,
    created_at
FROM grns 
WHERE grn_number = 'GRN-2025-12-001';

-- 2. How many items in this GRN?
SELECT 
    'GRN Items' as check_type,
    gi.id,
    gi.item_code,
    gi.item_name,
    gi.accepted_qty,
    gi.uid_count,
    gi.uid_generated
FROM grn_items gi
WHERE gi.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001');

-- 3. How many UIDs exist for this GRN RIGHT NOW?
SELECT 
    'Total UIDs in Registry' as check_type,
    COUNT(*) as total_uids
FROM uid_registry
WHERE grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001');

-- 4. If UIDs exist, show breakdown by item
SELECT 
    'UIDs Per Item' as check_type,
    i.code as item_code,
    COUNT(*) as uid_count
FROM uid_registry ur
LEFT JOIN items i ON ur.entity_id = i.id
WHERE ur.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001')
GROUP BY i.code;

-- 5. Show first 10 UIDs if they exist
SELECT 
    'Sample UIDs' as check_type,
    ur.uid,
    ur.entity_type,
    ur.created_at
FROM uid_registry ur
WHERE ur.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001')
ORDER BY ur.created_at
LIMIT 10;
