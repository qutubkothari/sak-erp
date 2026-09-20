-- Clear all transactional data (BOM, GRN, PR, PO) for tenant
-- This DOES NOT delete master data (items, vendors, etc.)
-- Replace tenant_id with your actual tenant ID

-- Set your tenant ID here
DO $$
DECLARE
    v_tenant_id UUID := 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'; -- CHANGE THIS TO YOUR TENANT ID
BEGIN
    RAISE NOTICE 'Starting deletion of transaction data for tenant: %', v_tenant_id;

    -- Clear Production related data
    RAISE NOTICE 'Deleting production assemblies...';
    DELETE FROM production_assemblies WHERE production_order_id IN (
        SELECT id FROM production_orders WHERE tenant_id = v_tenant_id
    );
    
    RAISE NOTICE 'Deleting production order components...';
    DELETE FROM production_order_components WHERE production_order_id IN (
        SELECT id FROM production_orders WHERE tenant_id = v_tenant_id
    );
    
    RAISE NOTICE 'Deleting production stage logs...';
    DELETE FROM production_stage_logs WHERE production_order_id IN (
        SELECT id FROM production_orders WHERE tenant_id = v_tenant_id
    );
    
    RAISE NOTICE 'Deleting production orders...';
    DELETE FROM production_orders WHERE tenant_id = v_tenant_id;

    -- Clear BOM data
    RAISE NOTICE 'Deleting BOM items...';
    DELETE FROM bom_items WHERE bom_id IN (
        SELECT id FROM bom_headers WHERE tenant_id = v_tenant_id
    );
    
    RAISE NOTICE 'Deleting BOM headers...';
    DELETE FROM bom_headers WHERE tenant_id = v_tenant_id;

    -- Clear GRN items FIRST (has FK to purchase_order_items)
    RAISE NOTICE 'Deleting GRN items...';
    DELETE FROM grn_items WHERE po_item_id IN (
        SELECT id FROM purchase_order_items WHERE po_id IN (
            SELECT id FROM purchase_orders WHERE tenant_id = v_tenant_id
        )
    );
    
    -- Clear PO items SECOND (after GRN items deleted)
    RAISE NOTICE 'Deleting purchase order items...';
    DELETE FROM purchase_order_items WHERE po_id IN (
        SELECT id FROM purchase_orders WHERE tenant_id = v_tenant_id
    );
    
    -- Clear GRN headers THIRD (modern table)
    RAISE NOTICE 'Deleting GRNs...';
    DELETE FROM grns WHERE tenant_id = v_tenant_id;

    -- Clear legacy GRN headers that reference purchase orders directly
    RAISE NOTICE 'Deleting legacy GRN records...';
    DELETE FROM grn WHERE po_id IN (
        SELECT id FROM purchase_orders WHERE tenant_id = v_tenant_id
    ) OR tenant_id = v_tenant_id;
    
    -- Clear PO headers FIFTH
    RAISE NOTICE 'Deleting Purchase Orders...';
    DELETE FROM purchase_orders WHERE tenant_id = v_tenant_id;

    -- Clear PR items FIFTH
    RAISE NOTICE 'Deleting purchase requisition items...';
    DELETE FROM purchase_requisition_items WHERE pr_id IN (
        SELECT id FROM purchase_requisitions WHERE tenant_id = v_tenant_id
    );
    
    -- Clear PR headers LAST
    RAISE NOTICE 'Deleting Purchase Requisitions...';
    DELETE FROM purchase_requisitions WHERE tenant_id = v_tenant_id;

    -- Clear UID registry (optional - uncomment if you want to clear UIDs too)
    -- RAISE NOTICE 'Deleting UID hierarchy...';
    -- DELETE FROM uid_hierarchy WHERE parent_uid IN (
    --     SELECT uid FROM uid_registry WHERE tenant_id = v_tenant_id
    -- );
    
    -- RAISE NOTICE 'Deleting UID registry...';
    -- DELETE FROM uid_registry WHERE tenant_id = v_tenant_id;

    -- Clear inventory movements (optional)
    -- RAISE NOTICE 'Deleting inventory movements...';
    -- DELETE FROM inventory_movements WHERE tenant_id = v_tenant_id;

    RAISE NOTICE '✅ Transaction data deletion completed successfully!';
    RAISE NOTICE 'Master data (Items, Vendors, Customers, etc.) preserved.';
END $$;

-- Verification: Count remaining records
SELECT 'BOMs' as table_name, COUNT(*) as count FROM bom_headers WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
UNION ALL
SELECT 'BOM Items', COUNT(*) FROM bom_items WHERE bom_id IN (SELECT id FROM bom_headers WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c')
UNION ALL
SELECT 'GRNs', COUNT(*) FROM grns WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
UNION ALL
SELECT 'GRN Items', COUNT(*) FROM grn_items WHERE grn_id IN (SELECT id FROM grns WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c')
UNION ALL
SELECT 'Purchase Orders', COUNT(*) FROM purchase_orders WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
UNION ALL
SELECT 'PO Items', COUNT(*) FROM purchase_order_items WHERE po_id IN (SELECT id FROM purchase_orders WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c')
UNION ALL
SELECT 'Purchase Requisitions', COUNT(*) FROM purchase_requisitions WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
UNION ALL
SELECT 'PR Items', COUNT(*) FROM purchase_requisition_items WHERE pr_id IN (SELECT id FROM purchase_requisitions WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c')
UNION ALL
SELECT 'Production Orders', COUNT(*) FROM production_orders WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
