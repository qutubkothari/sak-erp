-- Find where the UIDs actually are for GRN-2025-12-001

-- Check if UIDs are in 'uids' table instead of 'uid_registry'
SELECT 
    COUNT(*) as total_in_uids_table
FROM uids
WHERE grn_item_id IN (
    SELECT gi.id 
    FROM grn_items gi
    JOIN grns g ON gi.grn_id = g.id
    WHERE g.grn_number = 'GRN-2025-12-001'
);

-- Show UIDs from 'uids' table with details
SELECT 
    u.uid_code,
    u.item_code,
    u.item_name,
    u.batch_number,
    u.current_status,
    u.created_at,
    gi.item_code as grn_item_code,
    gi.accepted_qty
FROM uids u
JOIN grn_items gi ON u.grn_item_id = gi.id
JOIN grns g ON gi.grn_id = g.id
WHERE g.grn_number = 'GRN-2025-12-001'
ORDER BY u.created_at
LIMIT 50;

-- Count UIDs per item from 'uids' table
SELECT 
    gi.item_code,
    gi.item_name,
    gi.accepted_qty,
    COUNT(u.uid_code) as actual_uids_generated
FROM grn_items gi
JOIN grns g ON gi.grn_id = g.id
LEFT JOIN uids u ON u.grn_item_id = gi.id
WHERE g.grn_number = 'GRN-2025-12-001'
GROUP BY gi.item_code, gi.item_name, gi.accepted_qty
ORDER BY gi.item_code;

-- Check both tables to see where UIDs are
SELECT 
    'uid_registry' as table_name,
    COUNT(*) as count
FROM uid_registry ur
WHERE ur.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-001')
UNION ALL
SELECT 
    'uids' as table_name,
    COUNT(*) as count
FROM uids u
WHERE u.grn_item_id IN (
    SELECT gi.id 
    FROM grn_items gi
    JOIN grns g ON gi.grn_id = g.id
    WHERE g.grn_number = 'GRN-2025-12-001'
);
