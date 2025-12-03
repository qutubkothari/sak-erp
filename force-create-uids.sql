-- Force create UIDs for existing stock - SIMPLIFIED AND WORKING VERSION
-- This will definitely create UIDs

DO $$
DECLARE
    stock_rec RECORD;
    item_rec RECORD;
    warehouse_name TEXT;
    uid_text VARCHAR(100);
    entity_type_val VARCHAR(50);
    seq_num INTEGER;
    i INTEGER;
    total_created INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FORCE UID Generation Starting...';
    RAISE NOTICE '========================================';
    
    -- Loop through each stock entry
    FOR stock_rec IN 
        SELECT 
            se.id,
            se.tenant_id,
            se.item_id,
            se.warehouse_id,
            FLOOR(se.available_quantity)::INTEGER as qty,
            se.batch_number,
            se.metadata,
            i.code,
            i.name,
            i.category
        FROM stock_entries se
        JOIN items i ON se.item_id = i.id
        WHERE se.available_quantity > 0
        ORDER BY i.code
    LOOP
        RAISE NOTICE '';
        RAISE NOTICE '--- Processing: % (%) ---', stock_rec.code, stock_rec.name;
        RAISE NOTICE 'Quantity to generate: %', stock_rec.qty;
        
        -- Get warehouse name
        SELECT name INTO warehouse_name FROM warehouses WHERE id = stock_rec.warehouse_id LIMIT 1;
        warehouse_name := COALESCE(warehouse_name, 'Main Warehouse');
        
        -- Determine entity type
        entity_type_val := CASE
            WHEN stock_rec.category LIKE '%FINISHED%' THEN 'FG'
            WHEN stock_rec.category LIKE '%SUB_ASSEMBLY%' OR stock_rec.category LIKE '%ASSEMBLY%' THEN 'SA'
            WHEN stock_rec.category LIKE '%COMPONENT%' THEN 'CP'
            ELSE 'RM'
        END;
        
        RAISE NOTICE 'Entity Type: %', entity_type_val;
        
        -- Generate UIDs
        FOR i IN 1..stock_rec.qty LOOP
            -- Get sequence
            SELECT COALESCE(MAX(
                CASE 
                    WHEN uid ~ '^UID-SAIF-MFG-[A-Z]+-[0-9]+-[0-9]+$' 
                    THEN substring(uid from 'UID-SAIF-MFG-[A-Z]+-([0-9]+)-')::INTEGER
                    ELSE 0
                END
            ), 0) + 1
            INTO seq_num
            FROM uid_registry
            WHERE entity_type = entity_type_val;
            
            -- Build UID
            uid_text := 'UID-SAIF-MFG-' || entity_type_val || '-' || 
                       LPAD(seq_num::TEXT, 6, '0') || '-' || 
                       LPAD((seq_num % 100)::TEXT, 2, '0');
            
            -- Insert
            INSERT INTO uid_registry (
                tenant_id,
                uid,
                entity_type,
                entity_id,
                batch_number,
                location,
                status,
                lifecycle,
                metadata
            ) VALUES (
                stock_rec.tenant_id,
                uid_text,
                entity_type_val,
                stock_rec.item_id,
                stock_rec.batch_number,
                warehouse_name,
                'GENERATED',  -- Changed from ACTIVE to GENERATED
                jsonb_build_array(
                    jsonb_build_object(
                        'stage', 'RECEIVED',
                        'timestamp', NOW(),
                        'location', warehouse_name,
                        'reference', 'EXISTING_STOCK',
                        'user', 'SYSTEM'
                    )
                ),
                jsonb_build_object(
                    'item_code', stock_rec.code,
                    'item_name', stock_rec.name,
                    'stock_entry_id', stock_rec.id::text,
                    'created_retroactively', true
                )
            );
            
            total_created := total_created + 1;
            
            IF i = 1 THEN
                RAISE NOTICE 'Sample UID: %', uid_text;
            END IF;
        END LOOP;
        
        RAISE NOTICE '✓ Created % UIDs for %', stock_rec.qty, stock_rec.code;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COMPLETE!';
    RAISE NOTICE 'Total UIDs Created: %', total_created;
    RAISE NOTICE '========================================';
END $$;

-- Verify results
SELECT 
    'Summary' as type,
    COUNT(*) as total_uids,
    COUNT(DISTINCT entity_id) as unique_items
FROM uid_registry;

-- Show UIDs per item
SELECT 
    i.code,
    i.name,
    COUNT(ur.id) as uid_count,
    ur.entity_type,
    STRING_AGG(ur.uid, ', ' ORDER BY ur.uid) as sample_uids
FROM items i
LEFT JOIN uid_registry ur ON ur.entity_id = i.id
WHERE i.id IN (
    SELECT DISTINCT item_id FROM stock_entries WHERE available_quantity > 0
)
GROUP BY i.code, i.name, ur.entity_type
ORDER BY i.code;
