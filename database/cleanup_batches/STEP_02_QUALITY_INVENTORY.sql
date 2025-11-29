-- ============================================================================
-- STEP 3 & 4 CLEANUP (Quality/Defects + Inventory)
-- Run this after STEP_01 clears production data.
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
