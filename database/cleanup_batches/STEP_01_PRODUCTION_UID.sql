-- ============================================================================
-- STEP 1 & 2 CLEANUP (Production + UID tracking)
-- Run this block alone to clear manufacturing data before moving on.
-- ============================================================================

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
