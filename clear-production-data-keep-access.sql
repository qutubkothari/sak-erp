-- Clear all application data while preserving tenant and login/access tables.
-- Preserved tables: tenants, users, roles, user_roles

DO $$
DECLARE
  tables_to_truncate text;
  table_count integer;
BEGIN
  SELECT
    string_agg(format('%I.%I', table_schema, table_name), ', ' ORDER BY table_name),
    count(*)
  INTO tables_to_truncate, table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN ('tenants', 'users', 'roles', 'user_roles');

  IF tables_to_truncate IS NULL THEN
    RAISE EXCEPTION 'No tables found to clear.';
  END IF;

  EXECUTE 'TRUNCATE TABLE ' || tables_to_truncate || ' RESTART IDENTITY CASCADE';

  RAISE NOTICE 'Cleared % public tables while preserving tenants/users/roles/user_roles.', table_count;
END $$;

SELECT 'DONE' AS status;