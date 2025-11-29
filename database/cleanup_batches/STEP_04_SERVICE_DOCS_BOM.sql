-- ============================================================================
-- STEP 7, 8 & 9 CLEANUP (Service + Document control + BOM)
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
            WHERE table_schema = 'public' AND table_name = 'bom'
        ) INTO parent_exists;

        IF parent_exists THEN
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'bom'
                  AND column_name = 'tenant_id'
            ) INTO parent_has_tenant;
        END IF;

        IF parent_has_tenant THEN
            EXECUTE 'DELETE FROM bom_items
                     WHERE bom_id IN (
                         SELECT id FROM bom WHERE tenant_id IN (SELECT id FROM tenants)
                     )';
        ELSE
            EXECUTE 'DELETE FROM bom_items';
        END IF;
    END IF;
END $$;

-- BOM (Bill of Materials)
DO $$
DECLARE
    has_tenant_column boolean := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bom'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'bom'
              AND column_name = 'tenant_id'
        ) INTO has_tenant_column;

        IF has_tenant_column THEN
            EXECUTE 'DELETE FROM bom WHERE tenant_id IN (SELECT id FROM tenants)';
        ELSE
            EXECUTE 'DELETE FROM bom';
        END IF;
    END IF;
END $$;
