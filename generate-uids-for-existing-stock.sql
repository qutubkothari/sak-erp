-- Generate UIDs for all existing stock entries that don't have associated UIDs
-- This creates UIDs for items received before UID tracking was implemented

DO $$
DECLARE
    stock_rec RECORD;
    item_rec RECORD;
    warehouse_rec RECORD;
    uid_text VARCHAR(100);
    entity_type_val VARCHAR(50);
    seq_num INTEGER;
    checksum_val VARCHAR(2);
    i INTEGER;
    uids_created INTEGER := 0;
BEGIN
    -- Loop through all stock entries with available quantity > 0
    FOR stock_rec IN 
        SELECT 
            se.id as stock_entry_id,
            se.tenant_id,
            se.item_id,
            se.warehouse_id,
            se.available_quantity::INTEGER as qty,
            se.batch_number,
            se.metadata
        FROM stock_entries se
        WHERE se.available_quantity > 0
        ORDER BY se.created_at
    LOOP
        -- Get item details
        SELECT id, code, name, category INTO item_rec
        FROM items 
        WHERE id = stock_rec.item_id;
        
        -- Get warehouse details
        SELECT id, name INTO warehouse_rec
        FROM warehouses 
        WHERE id = stock_rec.warehouse_id;
        
        -- Skip if item not found
        CONTINUE WHEN item_rec IS NULL;
        
        -- Determine entity type based on item category
        entity_type_val := 'RM'; -- Default: Raw Material
        IF item_rec.category LIKE '%FINISHED%' THEN
            entity_type_val := 'FG';
        ELSIF item_rec.category LIKE '%SUB_ASSEMBLY%' OR item_rec.category LIKE '%ASSEMBLY%' THEN
            entity_type_val := 'SA';
        ELSIF item_rec.category LIKE '%COMPONENT%' THEN
            entity_type_val := 'CP';
        END IF;
        
        -- Check how many UIDs already exist for this stock entry
        -- (in case script is run multiple times)
        DECLARE
            existing_uid_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO existing_uid_count
            FROM uid_registry
            WHERE entity_id = stock_rec.item_id
                AND tenant_id = stock_rec.tenant_id
                AND metadata::text LIKE '%stock_entry_id%' || stock_rec.stock_entry_id || '%';
            
            -- Skip if UIDs already generated for this stock entry
            IF existing_uid_count >= stock_rec.qty THEN
                RAISE NOTICE 'Skipping stock entry % - UIDs already exist (% UIDs)', 
                    stock_rec.stock_entry_id, existing_uid_count;
                CONTINUE;
            END IF;
        END;
        
        -- Generate UIDs for the quantity in this stock entry
        FOR i IN 1..stock_rec.qty LOOP
            -- Get next sequence number
            SELECT COUNT(*) + 1 INTO seq_num
            FROM uid_registry
            WHERE uid LIKE 'UID-SAIF-MFG-' || entity_type_val || '-%';
            
            -- Generate checksum (simple modulo)
            checksum_val := LPAD((seq_num % 100)::TEXT, 2, '0');
            
            -- Build UID
            uid_text := 'UID-SAIF-MFG-' || entity_type_val || '-' || 
                       LPAD(seq_num::TEXT, 6, '0') || '-' || checksum_val;
            
            -- Check if GRN reference exists in metadata
            DECLARE
                grn_id_val UUID;
                grn_number_val VARCHAR(50);
            BEGIN
                grn_id_val := NULL;
                grn_number_val := NULL;
                
                -- Try to extract GRN reference from stock entry metadata
                IF stock_rec.metadata IS NOT NULL AND 
                   stock_rec.metadata::jsonb ? 'grn_reference' THEN
                    grn_number_val := stock_rec.metadata::jsonb->>'grn_reference';
                    
                    -- Try to find GRN ID from number
                    SELECT id INTO grn_id_val 
                    FROM grns 
                    WHERE grn_number = grn_number_val
                    LIMIT 1;
                END IF;
                
                -- Insert UID
                INSERT INTO uid_registry (
                    tenant_id,
                    uid,
                    entity_type,
                    entity_id,
                    grn_id,
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
                    grn_id_val,
                    stock_rec.batch_number,
                    COALESCE(warehouse_rec.name, 'Warehouse'),
                    'ACTIVE',
                    jsonb_build_array(
                        jsonb_build_object(
                            'stage', 'RECEIVED',
                            'timestamp', NOW(),
                            'location', COALESCE(warehouse_rec.name, 'Warehouse'),
                            'reference', COALESCE('GRN ' || grn_number_val, 'EXISTING_STOCK'),
                            'user', 'SYSTEM'
                        )
                    ),
                    jsonb_build_object(
                        'item_code', item_rec.code,
                        'item_name', item_rec.name,
                        'stock_entry_id', stock_rec.stock_entry_id,
                        'created_retroactively', true,
                        'grn_reference', grn_number_val
                    )
                );
                
                uids_created := uids_created + 1;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error creating UID for item %: %', item_rec.code, SQLERRM;
            END;
        END LOOP;
        
        RAISE NOTICE 'Created % UIDs for item % (Stock Entry: %)', 
            stock_rec.qty, item_rec.code, stock_rec.stock_entry_id;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ UID Generation Complete!';
    RAISE NOTICE 'Total UIDs Created: %', uids_created;
    RAISE NOTICE '========================================';
    
END $$;

-- Verify results
SELECT 
    'UID Generation Summary' as status,
    COUNT(*) as total_uids,
    COUNT(*) FILTER (WHERE grn_id IS NOT NULL) as uids_with_grn,
    COUNT(*) FILTER (WHERE job_order_id IS NOT NULL) as uids_with_job_order,
    COUNT(*) FILTER (WHERE grn_id IS NULL AND job_order_id IS NULL) as retroactive_uids
FROM uid_registry;

-- Show UIDs by entity type
SELECT 
    entity_type,
    COUNT(*) as uid_count,
    COUNT(DISTINCT entity_id) as unique_items
FROM uid_registry
GROUP BY entity_type
ORDER BY entity_type;

-- Show sample of newly created UIDs
SELECT 
    ur.uid,
    ur.entity_type,
    i.code as item_code,
    i.name as item_name,
    ur.location,
    ur.status,
    ur.metadata->>'created_retroactively' as retroactive
FROM uid_registry ur
LEFT JOIN items i ON ur.entity_id = i.id
WHERE ur.metadata->>'created_retroactively' = 'true'
ORDER BY ur.created_at DESC
LIMIT 20;
