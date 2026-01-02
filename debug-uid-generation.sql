-- Debug: Check what's preventing UID generation

-- 1. Check all stock entries
SELECT 
    'Stock Entries' as check_name,
    se.id as stock_entry_id,
    i.code as item_code,
    i.name as item_name,
    se.available_quantity,
    se.tenant_id,
    se.metadata
FROM stock_entries se
JOIN items i ON se.item_id = i.id
WHERE se.available_quantity > 0
ORDER BY i.code;

-- 2. Check if any UIDs exist for these items
SELECT 
    'Existing UIDs' as check_name,
    ur.uid,
    i.code as item_code,
    ur.tenant_id,
    ur.metadata->>'stock_entry_id' as linked_stock_entry
FROM uid_registry ur
JOIN items i ON ur.entity_id = i.id
ORDER BY ur.created_at DESC
LIMIT 20;

-- 3. Check tenant_id match
SELECT DISTINCT
    'Tenant Check' as check_name,
    se.tenant_id as stock_tenant_id,
    ur.tenant_id as uid_tenant_id,
    CASE 
        WHEN se.tenant_id = ur.tenant_id THEN '✓ MATCH'
        ELSE '✗ MISMATCH'
    END as match_status
FROM stock_entries se
CROSS JOIN uid_registry ur
LIMIT 1;

-- 4. Manual test - try to insert ONE UID for debugging
DO $$
DECLARE
    test_stock_id UUID;
    test_item_id UUID;
    test_tenant_id UUID;
    test_warehouse_id UUID;
    test_item_code TEXT;
    test_item_name TEXT;
    test_qty INTEGER;
    test_uid TEXT;
BEGIN
    -- Get first stock entry
    SELECT 
        se.id,
        se.item_id,
        se.tenant_id,
        se.warehouse_id,
        se.available_quantity::INTEGER,
        i.code,
        i.name
    INTO 
        test_stock_id,
        test_item_id,
        test_tenant_id,
        test_warehouse_id,
        test_qty,
        test_item_code,
        test_item_name
    FROM stock_entries se
    JOIN items i ON se.item_id = i.id
    WHERE se.available_quantity > 0
    ORDER BY se.created_at
    LIMIT 1;
    
    RAISE NOTICE 'Test Data:';
    RAISE NOTICE 'Stock Entry ID: %', test_stock_id;
    RAISE NOTICE 'Item: % (%)', test_item_code, test_item_name;
    RAISE NOTICE 'Tenant ID: %', test_tenant_id;
    RAISE NOTICE 'Quantity: %', test_qty;
    
    -- Check if UIDs already exist
    DECLARE
        existing_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO existing_count
        FROM uid_registry
        WHERE entity_id = test_item_id
            AND tenant_id = test_tenant_id
            AND metadata->>'stock_entry_id' = test_stock_id::text;
        
        RAISE NOTICE 'Existing UIDs for this stock entry: %', existing_count;
        
        IF existing_count > 0 THEN
            RAISE NOTICE '⚠️  UIDs already exist - skipping test insert';
            RETURN;
        END IF;
    END;
    
    -- Generate test UID
    test_uid := 'UID-SAIF-MFG-RM-TEST01-99';
    
    RAISE NOTICE 'Attempting to insert test UID: %', test_uid;
    
    -- Try insert
    BEGIN
        INSERT INTO uid_registry (
            tenant_id,
            uid,
            entity_type,
            entity_id,
            location,
            status,
            lifecycle,
            metadata
        ) VALUES (
            test_tenant_id,
            test_uid,
            'RM',
            test_item_id,
            'Test Warehouse',
            'ACTIVE',
            jsonb_build_array(
                jsonb_build_object(
                    'stage', 'TEST',
                    'timestamp', NOW(),
                    'location', 'Test',
                    'reference', 'DEBUG',
                    'user', 'SYSTEM'
                )
            ),
            jsonb_build_object(
                'item_code', test_item_code,
                'item_name', test_item_name,
                'stock_entry_id', test_stock_id,
                'created_retroactively', true,
                'test', true
            )
        );
        
        RAISE NOTICE '✅ Successfully inserted test UID!';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Failed to insert test UID: %', SQLERRM;
    END;
    
END $$;

-- 5. Verify test UID was created
SELECT 
    'Test UID Result' as check_name,
    ur.uid,
    i.code as item_code,
    ur.status,
    ur.metadata->>'test' as is_test
FROM uid_registry ur
JOIN items i ON ur.entity_id = i.id
WHERE ur.metadata->>'test' = 'true';
