-- Find deployment records that don't have corresponding UIDs in uid_registry
SELECT 
    pdh.id as deployment_id,
    pdh.uid_id,
    ur.uid as uid_string,
    pdh.organization_name,
    pdh.location_name,
    pdh.deployment_date,
    CASE 
        WHEN ur.id IS NULL THEN '❌ ORPHANED - UID not in registry'
        ELSE '✅ OK'
    END as status
FROM product_deployment_history pdh
LEFT JOIN uid_registry ur ON pdh.uid_id = ur.id
WHERE ur.id IS NULL
ORDER BY pdh.deployment_date DESC;

-- Count orphaned records
SELECT COUNT(*) as orphaned_deployment_count
FROM product_deployment_history pdh
LEFT JOIN uid_registry ur ON pdh.uid_id = ur.id
WHERE ur.id IS NULL;
