-- Find all UIDs ending with alphabetic characters (not numbers)
SELECT 
    uid,
    entity_type,
    status,
    location,
    created_at,
    CASE 
        WHEN RIGHT(uid, 2) ~ '^[A-Z]{2}$' THEN '✅ Ends with 2 letters'
        WHEN RIGHT(uid, 1) ~ '^[A-Z]$' THEN '✅ Ends with 1 letter'
        ELSE '❌ Ends with number'
    END as uid_type
FROM uid_registry
WHERE RIGHT(uid, 2) ~ '[A-Z]' -- UIDs with letters at the end
ORDER BY created_at DESC
LIMIT 20;

-- Count UIDs by suffix type
SELECT 
    CASE 
        WHEN RIGHT(uid, 2) ~ '^[A-Z]{2}$' THEN 'Ends with 2 letters'
        WHEN RIGHT(uid, 1) ~ '^[A-Z]$' THEN 'Ends with 1 letter'
        ELSE 'Ends with numbers'
    END as suffix_type,
    COUNT(*) as count
FROM uid_registry
GROUP BY suffix_type
ORDER BY count DESC;

-- Specifically search for the UID mentioned
SELECT 
    id,
    uid,
    entity_type,
    status,
    location,
    tenant_id,
    created_at
FROM uid_registry
WHERE uid LIKE '%OW' OR uid LIKE '%CP-000001%'
ORDER BY created_at DESC;
