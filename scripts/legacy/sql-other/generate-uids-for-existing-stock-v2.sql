-- Generate UIDs for existing stock - IMPROVED VERSION
-- This version ensures proper linking and tracking

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
    grn_id_val UUID;
    grn_number_val VARCHAR(50);
    job_order_id_val UUID;
    job_order_number_val VARCHAR(50);
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting UID Generation for Existing Stock';
    RAISE NOTICE '========================================';
    
    -- Loop through all stock entries with available quantity > 0
    FOR stock_rec IN 
        SELECT 
            se.id as stock_entry_id,
            se.tenant_id,
            se.item_id,
            se.warehouse_id,
            se.available_quantity::INTEGER as qty,
            se.batch_number,
            se.metadata,
            se.created_at as stock_created_at
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
        IF item_rec IS NULL THEN
            RAISE NOTICE 'Skipping - Item not found for stock entry %', stock_rec.stock_entry_id;
            CONTINUE;
        END IF;
        
        -- Determine entity type based on item category
        entity_type_val := 'RM'; -- Default: Raw Material
        IF item_rec.category LIKE '%FINISHED%' THEN
            entity_type_val := 'FG';
        ELSIF item_rec.category LIKE '%SUB_ASSEMBLY%' OR item_rec.category LIKE '%ASSEMBLY%' THEN
            entity_type_val := 'SA';
        ELSIF item_rec.category LIKE '%COMPONENT%' THEN
            entity_type_val := 'CP';
        END IF;
        
        -- Check if UIDs already exist for this stock entry
        DECLARE
            existing_uid_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO existing_uid_count
            FROM uid_registry
            WHERE entity_id = stock_rec.item_id
                AND tenant_id = stock_rec.tenant_id
                AND metadata::jsonb->>'stock_entry_id' = stock_rec.stock_entry_id::text;
            
            IF existing_uid_count >= stock_rec.qty THEN
                RAISE NOTICE 'Skipping % - UIDs already exist (% of %)', 
                    item_rec.code, existing_uid_count, stock_rec.qty;
                CONTINUE;
            END IF;
        END;
        
        RAISE NOTICE 'Processing % (%) - Quantity: %', item_rec.code, item_rec.name, stock_rec.qty;
        
        -- Extract GRN reference if exists
        grn_id_val := NULL;
        grn_number_val := NULL;
        IF stock_rec.metadata IS NOT NULL AND stock_rec.metadata::jsonb ? 'grn_reference' THEN
            grn_number_val := stock_rec.metadata::jsonb->>'grn_reference';
            SELECT id INTO grn_id_val FROM grns WHERE grn_number = grn_number_val LIMIT 1;
        END IF;
        
        -- Extract Job Order reference if exists
        job_order_id_val := NULL;
        job_order_number_val := NULL;
        IF stock_rec.metadata IS NOT NULL AND stock_rec.metadata::jsonb ? 'job_order_id' THEN
            job_order_id_val := (stock_rec.metadata::jsonb->>'job_order_id')::UUID;
            SELECT job_order_number INTO job_order_number_val 
            FROM production_job_orders 
            WHERE id = job_order_id_val;
        END IF;
        
        -- Generate UIDs for the quantity in this stock entry
        FOR i IN 1..stock_rec.qty LOOP
            -- Get next sequence number for this entity type
            SELECT COUNT(*) + 1 INTO seq_num
            FROM uid_registry
            WHERE uid LIKE 'UID-SAIF-MFG-' || entity_type_val || '-%';
            
            -- Generate checksum (simple modulo)
            checksum_val := LPAD((seq_num % 100)::TEXT, 2, '0');
            
            -- Build UID
            uid_text := 'UID-SAIF-MFG-' || entity_type_val || '-' || 
                       LPAD(seq_num::TEXT, 6, '0') || '-' || checksum_val;
            
            -- Insert UID with proper relationships
            BEGIN
                INSERT INTO uid_registry (
                    tenant_id,
                    uid,
                    entity_type,
                    entity_id,
                    grn_id,
                    job_order_id,
                    batch_number,
                    location,
                    status,
                    lifecycle,
                    metadata,
                    created_at
                ) VALUES (
                    stock_rec.tenant_id,
                    uid_text,
                    entity_type_val,
                    stock_rec.item_id,
                    grn_id_val,
                    job_order_id_val,
                    stock_rec.batch_number,
                    COALESCE(warehouse_rec.name, 'Warehouse'),
                    'ACTIVE',
                    jsonb_build_array(
                        jsonb_build_object(
                            'stage', 'RECEIVED',
                            'timestamp', stock_rec.stock_created_at,
                            'location', COALESCE(warehouse_rec.name, 'Warehouse'),
                            'reference', COALESCE(
                                'GRN ' || grn_number_val, 
                                'JO ' || job_order_number_val,
                                'EXISTING_STOCK'
                            ),
                            'user', 'SYSTEM'
                        )
                    ),
                    jsonb_build_object(
                        'item_code', item_rec.code,
                        'item_name', item_rec.name,
                        'stock_entry_id', stock_rec.stock_entry_id,
                        'created_retroactively', true,
                        'grn_reference', grn_number_val,
                        'job_order_reference', job_order_number_val
                    ),
                    stock_rec.stock_created_at  -- Use stock entry creation date
                );
                
                uids_created := uids_created + 1;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error creating UID for %: %', item_rec.code, SQLERRM;
            END;
        END LOOP;
        
        RAISE NOTICE '  ✓ Created % UIDs for % (Stock Entry: %)', 
            stock_rec.qty, item_rec.code, stock_rec.stock_entry_id;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ UID Generation Complete!';
    RAISE NOTICE 'Total UIDs Created: %', uids_created;
    RAISE NOTICE '========================================';
    
END $$;

-- Verification queries
SELECT 
    'Total UIDs' as metric,
    COUNT(*) as count
FROM uid_registry
UNION ALL
SELECT 
    'Retroactive UIDs' as metric,
    COUNT(*) as count
FROM uid_registry
WHERE metadata->>'created_retroactively' = 'true';

-- Show all items and their UID counts
SELECT 
    i.code as item_code,
    i.name as item_name,
    i.category,
    se.available_quantity,
    COUNT(ur.id) as uid_count,
    STRING_AGG(ur.uid, ', ' ORDER BY ur.created_at) as sample_uids
FROM stock_entries se
JOIN items i ON se.item_id = i.id
LEFT JOIN uid_registry ur ON ur.entity_id = se.item_id 
    AND ur.metadata->>'stock_entry_id' = se.id::text
WHERE se.available_quantity > 0
GROUP BY i.code, i.name, i.category, se.available_quantity, se.id
ORDER BY i.code;
