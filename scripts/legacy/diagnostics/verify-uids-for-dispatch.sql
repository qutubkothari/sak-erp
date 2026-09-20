-- Verify UIDs are visible for dispatch
-- Check if UIDs have correct status and tenant_id

-- 1. Count UIDs by status
SELECT 
    status,
    COUNT(*) as uid_count
FROM uid_registry
GROUP BY status
ORDER BY status;

-- 2. Check GENERATED UIDs with item details
SELECT 
    ur.uid,
    ur.status,
    ur.entity_type,
    i.code as item_code,
    i.name as item_name,
    ur.location,
    ur.tenant_id,
    ur.created_at
FROM uid_registry ur
JOIN items i ON ur.entity_id = i.id
WHERE ur.status = 'GENERATED'
ORDER BY ur.created_at DESC
LIMIT 20;

-- 3. Count UIDs per item (for dispatch selection)
SELECT 
    i.code,
    i.name,
    COUNT(ur.id) as total_uids,
    COUNT(CASE WHEN ur.status = 'GENERATED' THEN 1 END) as available_uids,
    ur.tenant_id
FROM items i
LEFT JOIN uid_registry ur ON ur.entity_id = i.id
WHERE i.id IN (
    SELECT DISTINCT item_id FROM stock_entries WHERE available_quantity > 0
)
GROUP BY i.code, i.name, ur.tenant_id
ORDER BY i.code;

-- 4. Sample query to test API endpoint
-- This simulates what the API does when frontend calls /uid?item_id=X&status=GENERATED
SELECT 
    ur.uid,
    ur.entity_id,
    ur.entity_type,
    ur.status,
    ur.location,
    ur.batch_number,
    ur.quality_status,
    ur.created_at,
    i.id as item_id,
    i.code as item_code,
    i.name as item_name
FROM uid_registry ur
JOIN items i ON ur.entity_id = i.id
WHERE ur.status = 'GENERATED'
  AND i.code = 'FG1'  -- Replace with your item code
ORDER BY ur.created_at DESC;
