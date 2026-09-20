-- ============================================================================
-- Fix Stock Entries for GRN-2025-12-005 and GRN-2025-12-006
-- ============================================================================
-- Issue: grn_items.item_id is NULL, preventing stock_entries creation
-- Solution: 
--   1. Repair item_id in grn_items using purchase_order_items or items table
--   2. Create missing stock_entries with correct quantities
--   3. Sync inventory_stock via adjust_inventory_stock function
-- ============================================================================

DO $$
DECLARE
    v_tenant_id UUID;
    v_warehouse_id UUID;
    v_schema_has_tenant BOOLEAN;
    v_has_accepted_qty BOOLEAN;
    v_has_rate BOOLEAN;
    v_has_item_code BOOLEAN;
    v_has_po_items BOOLEAN;
    v_qty_column TEXT;
    v_price_column TEXT;
    v_item_code_column TEXT;
    v_po_table TEXT;
    v_affected_count INT := 0;
    v_stock_created INT := 0;
BEGIN
    -- ========================================================================
    -- STEP 1: Detect Schema Variations
    -- ========================================================================
    RAISE NOTICE '=== Schema Detection ===';
    
    -- Check if tenant_id exists in stock_entries table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_entries' AND column_name = 'tenant_id'
    ) INTO v_schema_has_tenant;
    
    -- Check accepted_qty vs accepted_quantity
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grn_items' AND column_name = 'accepted_qty'
    ) INTO v_has_accepted_qty;
    v_qty_column := CASE WHEN v_has_accepted_qty THEN 'accepted_qty' ELSE 'accepted_quantity' END;
    
    -- Check rate vs unit_price
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grn_items' AND column_name = 'rate'
    ) INTO v_has_rate;
    v_price_column := CASE WHEN v_has_rate THEN 'rate' ELSE 'unit_price' END;
    
    -- Check code vs item_code in items table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' AND column_name = 'code'
    ) INTO v_has_item_code;
    v_item_code_column := CASE WHEN v_has_item_code THEN 'code' ELSE 'item_code' END;
    
    -- Check purchase_order_items vs po_items
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'purchase_order_items'
    ) INTO v_has_po_items;
    v_po_table := CASE WHEN v_has_po_items THEN 'purchase_order_items' ELSE 'po_items' END;
    
    RAISE NOTICE 'Schema: tenant_id=%, qty_col=%, price_col=%, item_code_col=%, po_table=%', 
        v_schema_has_tenant, v_qty_column, v_price_column, v_item_code_column, v_po_table;
    
    -- Get tenant_id and warehouse_id from first GRN
    IF v_schema_has_tenant THEN
        EXECUTE format('SELECT tenant_id FROM grns WHERE grn_number = ''GRN-2025-12-005'' LIMIT 1')
        INTO v_tenant_id;
    END IF;
    
    SELECT warehouse_id INTO v_warehouse_id 
    FROM grns 
    WHERE grn_number = 'GRN-2025-12-005' 
    LIMIT 1;
    
    RAISE NOTICE 'Tenant: %, Warehouse: %', v_tenant_id, v_warehouse_id;
    
    -- ========================================================================
    -- STEP 2: Repair item_id in grn_items
    -- ========================================================================
    RAISE NOTICE '=== Step 2: Repairing item_id in grn_items ===';
    
    -- Method 1: Match via purchase_order_items.item_id
    EXECUTE format('
        WITH updates AS (
            UPDATE grn_items gi
            SET item_id = poi.item_id
            FROM %I poi
            WHERE gi.po_item_id = poi.id
                AND gi.item_id IS NULL
                AND gi.grn_id IN (
                    SELECT id FROM grns 
                    WHERE grn_number IN (''GRN-2025-12-005'', ''GRN-2025-12-006'')
                )
                AND poi.item_id IS NOT NULL
            RETURNING gi.id
        )
        SELECT COUNT(*) FROM updates
    ', v_po_table) INTO v_affected_count;
    
    RAISE NOTICE 'Repaired % grn_items via PO items', v_affected_count;
    
    -- Method 2: Match via items table using item_code
    EXECUTE format('
        WITH updates AS (
            UPDATE grn_items gi
            SET item_id = i.id
            FROM items i
            WHERE upper(trim(gi.item_code)) = upper(trim(i.%I))
                AND gi.item_id IS NULL
                AND gi.grn_id IN (
                    SELECT id FROM grns 
                    WHERE grn_number IN (''GRN-2025-12-005'', ''GRN-2025-12-006'')
                )
            RETURNING gi.id
        )
        SELECT COUNT(*) FROM updates
    ', v_item_code_column) INTO v_affected_count;
    
    RAISE NOTICE 'Repaired % grn_items via item code match', v_affected_count;
    
    -- ========================================================================
    -- STEP 3: Create Missing Stock Entries
    -- ========================================================================
    RAISE NOTICE '=== Step 3: Creating Missing Stock Entries ===';
    
    -- Build and execute dynamic INSERT for missing stock_entries
    EXECUTE format('
        WITH grn_data AS (
            SELECT 
                gi.id as grn_item_id,
                gi.item_id,
                gi.item_code,
                gi.%I as accepted_qty,
                gi.%I as rate,
                g.grn_number,
                g.warehouse_id' ||
                CASE WHEN v_schema_has_tenant THEN ',
                g.tenant_id' ELSE '' END || '
            FROM grn_items gi
            JOIN grns g ON gi.grn_id = g.id
            WHERE g.grn_number IN (''GRN-2025-12-005'', ''GRN-2025-12-006'')
                AND gi.item_id IS NOT NULL
                AND gi.%I > 0
                AND NOT EXISTS (
                    SELECT 1 FROM stock_entries se
                    WHERE se.item_id = gi.item_id
                        AND se.metadata->>''grn_reference'' = g.grn_number
                )
        )
        INSERT INTO stock_entries (' ||
            CASE WHEN v_schema_has_tenant THEN 'tenant_id, ' ELSE '' END ||
            'item_id, warehouse_id, quantity, available_quantity, unit_price, metadata, created_at, updated_at
        )
        SELECT ' ||
            CASE WHEN v_schema_has_tenant THEN 'gd.tenant_id, ' ELSE '' END ||
            'gd.item_id,
            gd.warehouse_id,
            gd.accepted_qty,
            gd.accepted_qty,
            gd.rate,
            jsonb_build_object(
                ''grn_reference'', gd.grn_number,
                ''grn_item_id'', gd.grn_item_id::TEXT,
                ''item_code'', gd.item_code,
                ''created_from'', ''GRN_QC_ACCEPT_BACKFILL''
            ),
            NOW(),
            NOW()
        FROM grn_data gd
    ', v_qty_column, v_price_column, v_qty_column);
    
    GET DIAGNOSTICS v_stock_created = ROW_COUNT;
    RAISE NOTICE 'Created % stock entries', v_stock_created;
    
    -- ========================================================================
    -- STEP 4: Sync inventory_stock via RPC function
    -- ========================================================================
    RAISE NOTICE '=== Step 4: Syncing inventory_stock ===';
    
    -- Call adjust_inventory_stock for each new stock entry
    EXECUTE format('
        WITH grn_data AS (
            SELECT 
                gi.item_id,
                gi.%I as accepted_qty,
                g.grn_number,
                g.warehouse_id' ||
                CASE WHEN v_schema_has_tenant THEN ',
                g.tenant_id' ELSE '' END || '
            FROM grn_items gi
            JOIN grns g ON gi.grn_id = g.id
            WHERE g.grn_number IN (''GRN-2025-12-005'', ''GRN-2025-12-006'')
                AND gi.item_id IS NOT NULL
                AND gi.%I > 0
        )
        SELECT 
            adjust_inventory_stock(' ||
                CASE WHEN v_schema_has_tenant THEN 'gd.tenant_id, ' ELSE '' END ||
                'gd.item_id,
                gd.warehouse_id,
                NULL::UUID,
                gd.accepted_qty,
                ''RAW_MATERIAL''::TEXT
            )
        FROM grn_data gd
    ', v_qty_column, v_qty_column);
    
    RAISE NOTICE 'Synced inventory_stock for all items';
    
    -- ========================================================================
    -- STEP 5: Verification
    -- ========================================================================
    RAISE NOTICE '=== Verification ===';
    
    EXECUTE format('
        SELECT 
            g.grn_number,
            gi.item_code,
            gi.%I as accepted_qty,
            COALESCE(se.quantity, 0) as stock_quantity,
            CASE 
                WHEN se.id IS NULL THEN ''MISSING''
                WHEN gi.%I = se.quantity THEN ''OK''
                ELSE ''MISMATCH''
            END as status
        FROM grn_items gi
        JOIN grns g ON gi.grn_id = g.id
        LEFT JOIN stock_entries se ON se.item_id = gi.item_id 
            AND se.metadata->>''grn_reference'' = g.grn_number
        WHERE g.grn_number IN (''GRN-2025-12-005'', ''GRN-2025-12-006'')
        ORDER BY g.grn_number, gi.item_code
    ', v_qty_column, v_qty_column);
    
    RAISE NOTICE '=== Fix Complete ===';
    RAISE NOTICE 'Stock entries created: %', v_stock_created;
    
END $$;

-- Final verification query
SELECT 
    g.grn_number,
    gi.item_code,
    gi.item_id,
    gi.accepted_qty as grn_accepted_qty,
    se.quantity as stock_quantity,
    se.available_quantity as stock_available,
    CASE 
        WHEN se.id IS NULL THEN '✗ MISSING'
        WHEN gi.accepted_qty = se.quantity THEN '✓ MATCH'
        ELSE '✗ MISMATCH'
    END as status
FROM grn_items gi
JOIN grns g ON gi.grn_id = g.id
LEFT JOIN stock_entries se ON se.item_id = gi.item_id 
    AND se.metadata->>'grn_reference' = g.grn_number
WHERE g.grn_number IN ('GRN-2025-12-005', 'GRN-2025-12-006')
ORDER BY g.grn_number, gi.item_code;
