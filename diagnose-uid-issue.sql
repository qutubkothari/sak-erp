-- CORRECTED: Find the actual UID distribution issue

-- First, get the GRN ID
WITH grn_info AS (
    SELECT id, grn_number, tenant_id
    FROM grns
    WHERE grn_number = 'GRN-2025-12-001'
)

-- Show what's in grn_items
SELECT 
    'GRN Items Summary' as report_section,
    gi.item_code,
    gi.item_name,
    gi.accepted_qty,
    gi.uid_count as recorded_count,
    gi.uid_generated,
    i.id as item_uuid
FROM grn_items gi
JOIN items i ON gi.item_id = i.id
JOIN grn_info g ON gi.grn_id = g.id;

-- Show what's actually in uid_registry
WITH grn_info AS (
    SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001'
)
SELECT 
    'UIDs in Registry' as report_section,
    ur.uid,
    ur.entity_type,
    ur.entity_id,
    ur.batch_number,
    ur.created_at
FROM uid_registry ur
JOIN grn_info g ON ur.grn_id = g.id
ORDER BY ur.created_at;

-- Count UIDs per entity_id (item UUID)
WITH grn_info AS (
    SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001'
)
SELECT 
    'UID Count per Item UUID' as report_section,
    ur.entity_id,
    i.code as item_code,
    i.name as item_name,
    COUNT(*) as uid_count
FROM uid_registry ur
JOIN grn_info g ON ur.grn_id = g.id
LEFT JOIN items i ON ur.entity_id = i.id
GROUP BY ur.entity_id, i.code, i.name
ORDER BY uid_count DESC;

-- FINAL COMPARISON: Expected vs Actual
WITH grn_info AS (
    SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001'
)
SELECT 
    gi.item_code,
    gi.item_name,
    gi.accepted_qty as expected_qty,
    gi.uid_count as recorded_in_grn_items,
    COALESCE(uid_counts.actual_count, 0) as actual_in_registry,
    COALESCE(uid_counts.actual_count, 0) - gi.accepted_qty as excess_uids
FROM grn_items gi
JOIN grn_info g ON gi.grn_id = g.id
JOIN items i ON gi.item_id = i.id
LEFT JOIN (
    SELECT entity_id, COUNT(*) as actual_count
    FROM uid_registry ur
    WHERE ur.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001')
    GROUP BY entity_id
) uid_counts ON uid_counts.entity_id = i.id
ORDER BY gi.item_code;
