-- Check GRN-2025-12-001 data and UID generation issue
-- Expected: 2 items with 7 quantity each = 14 UIDs total
-- Actual: 38 UIDs generated

-- 1. Check GRN basic info
SELECT 
    g.id as grn_id,
    g.grn_number,
    g.status,
    g.created_at,
    g.tenant_id
FROM grns g
WHERE g.grn_number = 'GRN-2025-12-001';

-- 2. Check GRN items with quantities
SELECT 
    gi.id as grn_item_id,
    gi.item_code,
    gi.item_name,
    gi.received_qty,
    gi.accepted_qty,
    gi.rejected_qty,
    gi.uid_count,
    gi.uid_generated,
    i.id as item_id,
    i.category
FROM grn_items gi
JOIN items i ON gi.item_id = i.id
WHERE gi.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001');

-- 3. Count actual UIDs generated for this GRN
SELECT 
    COUNT(*) as total_uids_generated
FROM uid_registry ur
WHERE ur.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001');

-- 4. Show all UIDs with item breakdown
SELECT 
    i.code as item_code,
    i.name as item_name,
    COUNT(ur.uid) as uid_count_per_item
FROM uid_registry ur
JOIN items i ON ur.entity_id = i.id
WHERE ur.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001')
GROUP BY i.code, i.name
ORDER BY i.code;

-- 5. Show detailed UIDs (first 20)
SELECT 
    ur.uid,
    ur.entity_type,
    i.code as item_code,
    i.name as item_name,
    ur.created_at,
    ur.status,
    ur.batch_number
FROM uid_registry ur
JOIN items i ON ur.entity_id = i.id
WHERE ur.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001')
ORDER BY ur.created_at
LIMIT 20;

-- 6. Check if there are duplicate UIDs
SELECT 
    uid,
    COUNT(*) as duplicate_count
FROM uid_registry
WHERE grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001')
GROUP BY uid
HAVING COUNT(*) > 1;

-- 7. Check grn_items.uid_count vs actual UIDs in registry
SELECT 
    gi.item_code,
    gi.accepted_qty as expected_uids,
    gi.uid_count as recorded_uid_count,
    COUNT(ur.uid) as actual_uids_in_registry,
    (COUNT(ur.uid) - gi.accepted_qty) as difference
FROM grn_items gi
LEFT JOIN items i ON gi.item_id = i.id
LEFT JOIN uid_registry ur ON ur.grn_id = gi.grn_id AND ur.entity_id = i.id
WHERE gi.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001')
GROUP BY gi.item_code, gi.accepted_qty, gi.uid_count
ORDER BY gi.item_code;
