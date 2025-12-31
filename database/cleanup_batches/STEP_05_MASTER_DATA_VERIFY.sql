-- ============================================================================
-- STEP 10 CLEANUP (Master data) + Verification queries
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
        'uid_registry', 'bom', 'items', 'vendors', 'customers'
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
