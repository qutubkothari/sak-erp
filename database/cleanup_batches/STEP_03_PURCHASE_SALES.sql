-- ============================================================================
-- STEP 5 & 6 CLEANUP (Purchase + Sales data)
-- Run after inventory is clear.
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
