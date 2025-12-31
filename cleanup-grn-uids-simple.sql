-- SIMPLIFIED: Delete duplicate UIDs for GRN-2025-12-001
-- This version doesn't rely on complex joins

-- Get the GRN ID first
DO $$
DECLARE
    v_grn_id UUID;
    v_item1_id UUID;
    v_item2_id UUID;
    v_deleted_count INT;
BEGIN
    -- Get GRN ID
    SELECT id INTO v_grn_id FROM grns WHERE grn_number = 'GRN-2025-12-001';
    
    IF v_grn_id IS NULL THEN
        RAISE NOTICE 'GRN-2025-12-001 not found!';
        RETURN;
    END IF;
    
    RAISE NOTICE 'GRN ID: %', v_grn_id;
    
    -- Get item IDs
    SELECT id INTO v_item1_id FROM items WHERE code = 'RAD-TRR-QX71W915';
    SELECT id INTO v_item2_id FROM items WHERE code = 'RAD-TRR-R9MI1W915';
    
    RAISE NOTICE 'Item 1 ID: %', v_item1_id;
    RAISE NOTICE 'Item 2 ID: %', v_item2_id;
    
    -- Show current state
    RAISE NOTICE '=== BEFORE CLEANUP ===';
    RAISE NOTICE 'Total UIDs: %', (SELECT COUNT(*) FROM uid_registry WHERE grn_id = v_grn_id);
    RAISE NOTICE 'Item 1 UIDs: %', (SELECT COUNT(*) FROM uid_registry WHERE grn_id = v_grn_id AND entity_id = v_item1_id);
    RAISE NOTICE 'Item 2 UIDs: %', (SELECT COUNT(*) FROM uid_registry WHERE grn_id = v_grn_id AND entity_id = v_item2_id);
    
    -- Delete excess UIDs for Item 1 (keep first 7)
    WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
        FROM uid_registry
        WHERE grn_id = v_grn_id AND entity_id = v_item1_id
    )
    DELETE FROM uid_registry WHERE id IN (
        SELECT id FROM ranked WHERE rn > 7
    );
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % excess UIDs for Item 1', v_deleted_count;
    
    -- Delete excess UIDs for Item 2 (keep first 7)
    WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
        FROM uid_registry
        WHERE grn_id = v_grn_id AND entity_id = v_item2_id
    )
    DELETE FROM uid_registry WHERE id IN (
        SELECT id FROM ranked WHERE rn > 7
    );
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % excess UIDs for Item 2', v_deleted_count;
    
    -- Update grn_items uid_count
    UPDATE grn_items 
    SET uid_count = 7 
    WHERE grn_id = v_grn_id AND accepted_qty = 7;
    
    RAISE NOTICE 'Updated grn_items uid_count';
    
    -- Show final state
    RAISE NOTICE '=== AFTER CLEANUP ===';
    RAISE NOTICE 'Total UIDs: %', (SELECT COUNT(*) FROM uid_registry WHERE grn_id = v_grn_id);
    RAISE NOTICE 'Item 1 UIDs: %', (SELECT COUNT(*) FROM uid_registry WHERE grn_id = v_grn_id AND entity_id = v_item1_id);
    RAISE NOTICE 'Item 2 UIDs: %', (SELECT COUNT(*) FROM uid_registry WHERE grn_id = v_grn_id AND entity_id = v_item2_id);
END $$;

-- Verify final results
SELECT 
    i.code as item_code,
    gi.accepted_qty as expected,
    gi.uid_count as recorded,
    COUNT(ur.uid) as actual_in_registry
FROM grn_items gi
JOIN grns g ON gi.grn_id = g.id
JOIN items i ON gi.item_code = i.code
LEFT JOIN uid_registry ur ON ur.grn_id = g.id AND ur.entity_id = i.id
WHERE g.grn_number = 'GRN-2025-12-001'
GROUP BY i.code, gi.accepted_qty, gi.uid_count
ORDER BY i.code;
