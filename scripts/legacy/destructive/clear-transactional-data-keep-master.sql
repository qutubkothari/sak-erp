-- Clear ALL transactional data (including UIDs) while preserving master tables
--
-- ✅ Keeps: tenants/users/roles + master data like items/vendors/customers/warehouses
-- ❌ Clears: everything else (purchase, sales, production, service, quality, UID tables, logs, etc.)
--
-- WARNING:
-- - This runs for ALL tenants (global cleanup).
-- - Uses TRUNCATE ... CASCADE, so it will remove dependent rows in child tables.
-- - If you have additional master tables you want to preserve (e.g., employees, departments), add them to keep_tables.
--
-- Run in Supabase SQL Editor (Postgres).

DO $$
DECLARE
  keep_tables text[] := ARRAY[
    -- core/master (keep)
    'tenants',
    'companies',
    'plants',
    'roles',
    'users',

    -- master data (keep)
    'items',
    'vendors',
    'customers',
    'warehouses',

    -- migrations table (keep if present)
    'schema_migrations'
  ];

  truncate_list text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename)
    INTO truncate_list
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename <> ALL (keep_tables);

  IF truncate_list IS NULL THEN
    RAISE NOTICE 'No tables to truncate (after keep-list).';
    RETURN;
  END IF;

  RAISE NOTICE 'Truncating (transactional) tables: %', truncate_list;

  EXECUTE 'TRUNCATE TABLE ' || truncate_list || ' RESTART IDENTITY CASCADE';

  RAISE NOTICE '✅ Done: transactional data cleared, master preserved. (UIDs included)';
END $$;
