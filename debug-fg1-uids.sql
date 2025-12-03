-- Get the exact item_id for FG1 that the frontend would use
SELECT 
    id as item_id,
    code,
    name,
    category
FROM items
WHERE code = 'FG1';

-- Check UIDs for FG1 with all the details
SELECT 
    ur.uid,
    ur.entity_id,
    ur.entity_type,
    ur.status,
    ur.tenant_id,
    ur.location,
    ur.created_at,
    i.code as item_code,
    i.name as item_name
FROM uid_registry ur
LEFT JOIN items i ON ur.entity_id = i.id
WHERE i.code = 'FG1'
ORDER BY ur.created_at DESC;

-- Check if there's a status/tenant mismatch
SELECT 
    'Status Check' as check_type,
    status,
    COUNT(*) as count
FROM uid_registry
WHERE entity_id IN (SELECT id FROM items WHERE code = 'FG1')
GROUP BY status;
