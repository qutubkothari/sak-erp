 -- ============================================================================
 -- COMPLETE DATA CLEANUP SCRIPT
 -- ============================================================================
 -- WARNING: This will delete ALL transactional data while preserving structure
 -- Use this for testing purposes only
 -- Run this in Supabase SQL Editor before each test cycle
 -- ============================================================================

 -- DISABLE FOREIGN KEY CHECKS (PostgreSQL doesn't have this, so we delete in order)

-- Production assembly components (child records first)
DO $$
DECLARE
    parent_exists boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'production_assembly_components'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'production_assemblies'
        ) INTO parent_exists;

        IF parent_exists THEN
            EXECUTE 'DELETE FROM production_assembly_components
                         WHERE production_assembly_id IN (SELECT id FROM production_assemblies)';
        ELSE
            EXECUTE 'DELETE FROM production_assembly_components';
        END IF;
    END IF;
END $$;

-- Production assemblies
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'production_assemblies'
    ) THEN
        SELECT EXISTS (
            SELECT 1
                        FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'production_assemblies'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM production_assemblies WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM production_assemblies';
        END IF;
    END IF;
END $$;

-- Production orders
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'production_orders'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'production_orders'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM production_orders WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM production_orders';
        END IF;
    END IF;
END $$;

-- Station completions (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'station_completions') THEN
        DELETE FROM station_completions;
    END IF;
END $$;

-- Work stations (only if table exists)
DO $$ 
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'work_stations'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'work_stations'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM work_stations WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM work_stations';
        END IF;
    END IF;
END $$;

-- Production routing (only if table exists)
DO $$ 
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'production_routing'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'production_routing'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM production_routing WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM production_routing';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: DELETE UID TRACKING DATA
-- ============================================================================

-- UID registry (all product tracking)
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'uid_registry'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'uid_registry'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM uid_registry WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM uid_registry';
        END IF;
    END IF;
END $$;

-- Legacy UID records table (only if it still exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'uid_records'
    ) THEN
        EXECUTE 'DELETE FROM uid_records';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: DELETE QUALITY & DEFECTS DATA
-- ============================================================================

-- Repair order items (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'repair_order_items') THEN
        DELETE FROM repair_order_items;
    END IF;
END $$;

-- Repair orders (only if table exists)
DO $$ 
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'repair_orders'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'repair_orders'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM repair_orders WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM repair_orders';
        END IF;
    END IF;
END $$;

-- RTV items (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rtv_items') THEN
        DELETE FROM rtv_items;
    END IF;
END $$;

-- Return to vendor (only if table exists)
DO $$ 
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'return_to_vendor'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'return_to_vendor'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM return_to_vendor WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM return_to_vendor';
        END IF;
    END IF;
END $$;

-- Defective units (only if table exists)
DO $$ 
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'defective_units'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'defective_units'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM defective_units WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM defective_units';
        END IF;
    END IF;
END $$;

-- NCR records (only if table exists)
DO $$ 
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'ncr'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'ncr'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM ncr WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM ncr';
        END IF;
    END IF;
END $$;

-- Quality inspections (only if table exists)
DO $$ 
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'quality_inspections'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'quality_inspections'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM quality_inspections WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM quality_inspections';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: DELETE INVENTORY DATA
-- ============================================================================

-- Inventory transactions (only if table exists)
DO $$ 
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'inventory_transactions'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'inventory_transactions'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM inventory_transactions WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM inventory_transactions';
        END IF;
    END IF;
END $$;

-- Stock movements (only if table exists)
DO $$ 
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'stock_movements'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'stock_movements'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM stock_movements WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM stock_movements';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: DELETE PURCHASE DATA
-- ============================================================================

-- GRN items
DO $$
DECLARE
    parent_exists boolean := FALSE;
    parent_has_tenant boolean := FALSE;
    has_parent_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'uids'
    ) THEN
        EXECUTE 'DELETE FROM uids';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'grn_items'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'grn'
        ) INTO parent_exists;

        IF parent_exists THEN
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'grn'
                  AND column_name = 'tenant_id'
            ) INTO parent_has_tenant;
        END IF;

        IF parent_has_tenant THEN
            EXECUTE 'DELETE FROM grn_items
                     WHERE grn_id IN (
                         SELECT id FROM grn WHERE tenant_id IN (SELECT id FROM tenants)
                     )';
        ELSE
            EXECUTE 'DELETE FROM grn_items';
        END IF;
    END IF;
END $$;

-- GRN (Goods Receipt Notes)
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'grn'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'grn'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM grn WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM grn';
        END IF;
    END IF;
END $$;

-- Purchase order items
DO $$
DECLARE
    parent_exists boolean := FALSE;
    parent_has_tenant boolean := FALSE;
    has_parent_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'purchase_order_items'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'purchase_orders'
        ) INTO parent_exists;

        IF parent_exists THEN
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'purchase_orders'
                  AND column_name = 'tenant_id'
            ) INTO parent_has_tenant;
        END IF;

        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'purchase_order_items'
              AND column_name = 'purchase_order_id'
        ) INTO has_parent_column;

        IF parent_has_tenant AND has_parent_column THEN
            EXECUTE 'DELETE FROM purchase_order_items
                     WHERE purchase_order_id IN (
                         SELECT id FROM purchase_orders WHERE tenant_id IN (SELECT id FROM tenants)
                     )';
        ELSE
            EXECUTE 'DELETE FROM purchase_order_items';
        END IF;
    END IF;
END $$;

-- Purchase orders
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'purchase_orders'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'purchase_orders'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM purchase_orders WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM purchase_orders';
        END IF;
    END IF;
END $$;

-- Purchase requisition items
DO $$
DECLARE
    parent_exists boolean := FALSE;
    parent_has_tenant boolean := FALSE;
    has_parent_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'purchase_requisition_items'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'purchase_requisitions'
        ) INTO parent_exists;

        IF parent_exists THEN
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'purchase_requisitions'
                  AND column_name = 'tenant_id'
            ) INTO parent_has_tenant;
        END IF;

        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'purchase_requisition_items'
              AND column_name = 'purchase_requisition_id'
        ) INTO has_parent_column;

        IF parent_has_tenant AND has_parent_column THEN
            EXECUTE 'DELETE FROM purchase_requisition_items
                     WHERE purchase_requisition_id IN (
                         SELECT id FROM purchase_requisitions WHERE tenant_id IN (SELECT id FROM tenants)
                     )';
        ELSE
            EXECUTE 'DELETE FROM purchase_requisition_items';
        END IF;
    END IF;
END $$;

-- Purchase requisitions
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'purchase_requisitions'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'purchase_requisitions'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM purchase_requisitions WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM purchase_requisitions';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: DELETE SALES DATA
-- ============================================================================

-- Warranty claims
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'warranty_claims'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'warranty_claims'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM warranty_claims WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM warranty_claims';
        END IF;
    END IF;
END $$;

-- Warranties
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'warranties'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'warranties'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM warranties WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM warranties';
        END IF;
    END IF;
END $$;

-- Invoices
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'invoices'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'invoices'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM invoices WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM invoices';
        END IF;
    END IF;
END $$;

-- Dispatch items
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'dispatch_items'
    ) THEN
        EXECUTE 'DELETE FROM dispatch_items';
    END IF;
END $$;

-- Dispatch notes
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'dispatch_notes'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'dispatch_notes'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM dispatch_notes WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM dispatch_notes';
        END IF;
    END IF;
END $$;

-- Sales order items
DO $$
DECLARE
    parent_exists boolean := FALSE;
    parent_has_tenant boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'sales_order_items'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'sales_orders'
        ) INTO parent_exists;

        IF parent_exists THEN
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'sales_orders'
                  AND column_name = 'tenant_id'
            ) INTO parent_has_tenant;
        END IF;

        IF parent_has_tenant THEN
            EXECUTE 'DELETE FROM sales_order_items
                     WHERE sales_order_id IN (
                         SELECT id FROM sales_orders WHERE tenant_id IN (SELECT id FROM tenants)
                     )';
        ELSE
            EXECUTE 'DELETE FROM sales_order_items';
        END IF;
    END IF;
END $$;

-- Sales orders
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'sales_orders'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'sales_orders'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM sales_orders WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM sales_orders';
        END IF;
    END IF;
END $$;

-- Quotation items
DO $$
DECLARE
    parent_exists boolean := FALSE;
    parent_has_tenant boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'quotation_items'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'quotations'
        ) INTO parent_exists;

        IF parent_exists THEN
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'quotations'
                  AND column_name = 'tenant_id'
            ) INTO parent_has_tenant;
        END IF;

        IF parent_has_tenant THEN
            EXECUTE 'DELETE FROM quotation_items
                     WHERE quotation_id IN (
                         SELECT id FROM quotations WHERE tenant_id IN (SELECT id FROM tenants)
                     )';
        ELSE
            EXECUTE 'DELETE FROM quotation_items';
        END IF;
    END IF;
END $$;

-- Quotations
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'quotations'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'quotations'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM quotations WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM quotations';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 7: DELETE SERVICE DATA
-- ============================================================================

-- Service history
DO $$
DECLARE
    parent_exists boolean := FALSE;
    parent_has_tenant boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'service_history'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'service_requests'
        ) INTO parent_exists;

        IF parent_exists THEN
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'service_requests'
                  AND column_name = 'tenant_id'
            ) INTO parent_has_tenant;
        END IF;

        IF parent_has_tenant THEN
            EXECUTE 'DELETE FROM service_history
                     WHERE service_request_id IN (
                         SELECT id FROM service_requests WHERE tenant_id IN (SELECT id FROM tenants)
                     )';
        ELSE
            EXECUTE 'DELETE FROM service_history';
        END IF;
    END IF;
END $$;

-- Service requests
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'service_requests'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'service_requests'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM service_requests WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM service_requests';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 8: DELETE DOCUMENT CONTROL DATA
-- ============================================================================

-- Document revisions
DO $$
DECLARE
    parent_exists boolean := FALSE;
    parent_has_tenant boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'document_revisions'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'documents'
        ) INTO parent_exists;

        IF parent_exists THEN
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'documents'
                  AND column_name = 'tenant_id'
            ) INTO parent_has_tenant;
        END IF;

        IF parent_has_tenant THEN
            EXECUTE 'DELETE FROM document_revisions
                     WHERE document_id IN (
                         SELECT id FROM documents WHERE tenant_id IN (SELECT id FROM tenants)
                     )';
        ELSE
            EXECUTE 'DELETE FROM document_revisions';
        END IF;
    END IF;
END $$;

-- Documents
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'documents'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'documents'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM documents WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM documents';
        END IF;
    END IF;
END $$;

-- Document categories
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'document_categories'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'document_categories'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM document_categories WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM document_categories';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 9: DELETE BOM DATA
-- ============================================================================

-- BOM items
DO $$
DECLARE
    parent_exists boolean := FALSE;
    parent_has_tenant boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bom_items'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'bom_headers'
        ) INTO parent_exists;

        IF parent_exists THEN
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'bom_headers'
                  AND column_name = 'tenant_id'
            ) INTO parent_has_tenant;
        END IF;

        IF parent_has_tenant THEN
            EXECUTE 'DELETE FROM bom_items
                     WHERE bom_id IN (
                         SELECT id FROM bom_headers WHERE tenant_id IN (SELECT id FROM tenants)
                     )';
        ELSE
            EXECUTE 'DELETE FROM bom_items';
        END IF;
    END IF;
END $$;

-- BOM headers (Bill of Materials definitions)
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bom_headers'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'bom_headers'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM bom_headers WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM bom_headers';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 10: DELETE MASTER DATA (Keep Structure)
-- ============================================================================

-- Items (products/materials)
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'items'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'items'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM items WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM items';
        END IF;
    END IF;
END $$;

-- Customers
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'customers'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'customers'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM customers WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM customers';
        END IF;
    END IF;
END $$;

-- Vendors
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'vendors'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'vendors'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM vendors WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM vendors';
        END IF;
    END IF;
END $$;

-- Plants/Warehouses
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'plants'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'plants'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM plants WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM plants';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 11: RESET SEQUENCES (Optional - for clean numbering)
-- ============================================================================

-- Note: You may want to reset auto-increment sequences
-- This depends on your specific implementation

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS cleanup_verification (
    table_name text,
    remaining_records bigint
);

TRUNCATE cleanup_verification;

DO $$
DECLARE
    tbl text;
    cnt bigint;
    tables text[] := ARRAY[
        'production_orders', 'purchase_orders', 'sales_orders', 'grn',
        'uid_registry', 'bom_headers', 'items', 'vendors', 'customers'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = tbl
        ) THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', tbl) INTO cnt;
        ELSE
            cnt := NULL;
        END IF;

        INSERT INTO cleanup_verification VALUES (tbl, cnt);
    END LOOP;
END $$;

SELECT table_name,
       COALESCE(remaining_records, 0) AS remaining_records
FROM cleanup_verification;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
WHAT IS PRESERVED:
- User accounts
- Tenant configuration
- System settings
- Table structures
- Indexes and constraints

WHAT IS DELETED:
- All transactional data
- All master data (items, vendors, customers)
- All tracking records (UIDs, quality, inventory)
- All documents

USAGE:
1. Copy this entire script
2. Go to Supabase → SQL Editor
3. Paste and run
4. Wait for completion
5. Verify with the SELECT queries at the end
6. System is now clean for fresh testing

IMPORTANT:
- Always backup before running in production
- This is for testing environments only
- Cannot be undone - data is permanently deleted
*/
