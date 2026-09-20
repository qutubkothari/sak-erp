-- Check if UIDs were created by the retroactive generation script

-- 1. Total count of all UIDs
SELECT 
    'Total UIDs in System' as description,
    COUNT(*) as count
FROM uid_registry;

-- 2. Count of retroactively created UIDs
SELECT 
    'Retroactively Created UIDs' as description,
    COUNT(*) as count
FROM uid_registry
WHERE metadata->>'created_retroactively' = 'true';

-- 3. UIDs by source
SELECT 
    CASE 
        WHEN grn_id IS NOT NULL THEN 'From GRN'
        WHEN job_order_id IS NOT NULL THEN 'From Job Order'
        WHEN metadata->>'created_retroactively' = 'true' THEN 'Retroactive'
        ELSE 'Unknown'
    END as source,
    COUNT(*) as uid_count
FROM uid_registry
GROUP BY 
    CASE 
        WHEN grn_id IS NOT NULL THEN 'From GRN'
        WHEN job_order_id IS NOT NULL THEN 'From Job Order'
        WHEN metadata->>'created_retroactively' = 'true' THEN 'Retroactive'
        ELSE 'Unknown'
    END
ORDER BY uid_count DESC;

-- 4. All UIDs with details (recent 50)
SELECT 
    ur.uid,
    ur.entity_type,
    i.code as item_code,
    i.name as item_name,
    ur.location,
    ur.status,
    CASE 
        WHEN ur.grn_id IS NOT NULL THEN 'GRN: ' || g.grn_number
        WHEN ur.job_order_id IS NOT NULL THEN 'JO: ' || jo.job_order_number
        WHEN ur.metadata->>'created_retroactively' = 'true' THEN 'RETROACTIVE'
        ELSE 'UNKNOWN'
    END as source,
    ur.created_at
FROM uid_registry ur
LEFT JOIN items i ON ur.entity_id = i.id
LEFT JOIN grns g ON ur.grn_id = g.id
LEFT JOIN production_job_orders jo ON ur.job_order_id = jo.id
ORDER BY ur.created_at DESC
LIMIT 50;

-- 5. UIDs by entity type
SELECT 
    entity_type,
    COUNT(*) as uid_count,
    COUNT(DISTINCT entity_id) as unique_items
FROM uid_registry
GROUP BY entity_type
ORDER BY entity_type;

-- 6. Check stock entries vs UIDs
SELECT 
    'Stock Entries with Available Quantity' as description,
    COUNT(*) as count,
    SUM(available_quantity::INTEGER) as total_quantity
FROM stock_entries
WHERE available_quantity > 0;

SELECT 
    'Total UIDs Created' as description,
    COUNT(*) as count
FROM uid_registry;

-- 7. Items with stock but no UIDs
SELECT 
    i.code as item_code,
    i.name as item_name,
    se.available_quantity,
    COUNT(ur.id) as uid_count
FROM stock_entries se
JOIN items i ON se.item_id = i.id
LEFT JOIN uid_registry ur ON ur.entity_id = se.item_id 
    AND ur.metadata->>'stock_entry_id' = se.id::text
WHERE se.available_quantity > 0
GROUP BY i.code, i.name, se.available_quantity, se.id
HAVING COUNT(ur.id) = 0
ORDER BY se.available_quantity DESC;
