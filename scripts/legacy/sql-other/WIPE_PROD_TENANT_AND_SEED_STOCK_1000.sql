-- ⚠️ DANGEROUS: Production wipe + seed script (TENANT-SCOPED)
--
-- What this does (for ONE tenant only):
-- 1) Creates a backup schema and copies key transactional rows for that tenant.
-- 2) Deletes transactional data (Production + Purchase + Inventory + UIDs) for that tenant.
-- 3) Disables UID tracking for all items (so issuing can be tested without UIDs).
-- 4) Seeds inventory_stock + stock_entries to 1000 for ALL items in ONE warehouse.
--
-- How to use:
-- - Run ONLY in Supabase SQL Editor.
-- - Change v_confirm to the exact string YES_WIPE_PROD.
-- - Change v_tenant_id if needed.
--
-- Notes:
-- - This keeps master data: items, vendors, warehouses, customers.
-- - For seeding, it chooses the first warehouse for the tenant.
--   If you want a specific warehouse, set v_seed_warehouse_id manually.

DO $$
DECLARE
  v_confirm text := 'YES_WIPE_PROD';
  v_tenant_id uuid := 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

  v_backup_schema text := 'backup_wipe_' || to_char(now(), 'YYYYMMDD_HH24MISS');
  v_seed_qty numeric := 1000;
  v_seed_warehouse_id uuid;
  v_actor_user_id uuid;

  -- Schema feature flags (for dynamic seeding)
  has_inv_location_id boolean := false;
  has_inv_qty boolean := false;
  has_inv_reserved boolean := false;
  has_inv_available boolean := false;
  inv_available_col text := 'available_quantity';
  inv_available_writable boolean := true;
  has_inv_category boolean := false;
  has_inv_updated_at boolean := false;
  inv_category_expr text := NULL;
  has_se_allocated boolean := false;
  has_se_unit_price boolean := false;
  has_se_metadata boolean := false;
  has_se_created_at boolean := false;
  has_se_updated_at boolean := false;
  se_available_col text := 'available_quantity';
  se_available_writable boolean := true;
BEGIN
  IF v_confirm IS NULL OR btrim(v_confirm) <> 'YES_WIPE_PROD' THEN
    RAISE EXCEPTION 'Refusing to run. Set v_confirm := YES_WIPE_PROD (exact).';
  END IF;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'v_tenant_id is required';
  END IF;

  RAISE NOTICE '🚨 PRODUCTION WIPE+SEED starting for tenant=%', v_tenant_id;

  -- Pick an actor user for audit triggers (if present)
  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT id
    INTO v_actor_user_id
    FROM users
    WHERE tenant_id = v_tenant_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_actor_user_id IS NOT NULL THEN
      PERFORM set_config('app.current_user_id', v_actor_user_id::text, true);
      RAISE NOTICE 'Using app.current_user_id=%', v_actor_user_id;
    END IF;
  END IF;

  -- Choose warehouse for seeding
  SELECT id
  INTO v_seed_warehouse_id
  FROM warehouses
  WHERE tenant_id = v_tenant_id
  ORDER BY created_at NULLS LAST, name NULLS LAST
  LIMIT 1;

  IF v_seed_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'No warehouses found for tenant %. Cannot seed stock.', v_tenant_id;
  END IF;

  RAISE NOTICE 'Seeding stock into warehouse_id=%', v_seed_warehouse_id;

  -- -------------------------
  -- 1) BACKUP (tenant-scoped)
  -- -------------------------
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_backup_schema);
  RAISE NOTICE 'Backup schema: %', v_backup_schema;

  -- Helper macro-ish: backup table if it exists and has tenant_id
  IF to_regclass('public.production_job_orders') IS NOT NULL THEN
    EXECUTE format('CREATE TABLE %I.production_job_orders AS SELECT * FROM production_job_orders WHERE tenant_id = %L', v_backup_schema, v_tenant_id);
  END IF;
  IF to_regclass('public.job_order_materials') IS NOT NULL THEN
    -- Some deployments do not have tenant_id on this table; fall back to job_order_id -> production_job_orders
    BEGIN
      EXECUTE format('CREATE TABLE %I.job_order_materials AS SELECT * FROM job_order_materials WHERE tenant_id = %L', v_backup_schema, v_tenant_id);
    EXCEPTION WHEN undefined_column THEN
      DECLARE
        v_fk_col text;
      BEGIN
        SELECT CASE
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'job_order_materials' AND column_name = 'job_order_id'
          ) THEN 'job_order_id'
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'job_order_materials' AND column_name = 'production_job_order_id'
          ) THEN 'production_job_order_id'
          ELSE NULL
        END
        INTO v_fk_col;

        IF v_fk_col IS NULL THEN
          RAISE NOTICE 'Skipping job_order_materials backup: no tenant_id and no job-order FK column found.';
        ELSE
          EXECUTE format(
            'CREATE TABLE %I.job_order_materials AS '
            'SELECT m.* '
            'FROM job_order_materials m '
            'WHERE m.%I IN (SELECT id FROM production_job_orders WHERE tenant_id = %L)',
            v_backup_schema,
            v_fk_col,
            v_tenant_id
          );
        END IF;
      END;
    END;
  END IF;
  IF to_regclass('public.job_order_operations') IS NOT NULL THEN
    -- Some deployments do not have tenant_id on this table; fall back to job_order_id -> production_job_orders
    BEGIN
      EXECUTE format('CREATE TABLE %I.job_order_operations AS SELECT * FROM job_order_operations WHERE tenant_id = %L', v_backup_schema, v_tenant_id);
    EXCEPTION WHEN undefined_column THEN
      DECLARE
        v_fk_col text;
      BEGIN
        SELECT CASE
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'job_order_operations' AND column_name = 'job_order_id'
          ) THEN 'job_order_id'
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'job_order_operations' AND column_name = 'production_job_order_id'
          ) THEN 'production_job_order_id'
          ELSE NULL
        END
        INTO v_fk_col;

        IF v_fk_col IS NULL THEN
          RAISE NOTICE 'Skipping job_order_operations backup: no tenant_id and no job-order FK column found.';
        ELSE
          EXECUTE format(
            'CREATE TABLE %I.job_order_operations AS '
            'SELECT o.* '
            'FROM job_order_operations o '
            'WHERE o.%I IN (SELECT id FROM production_job_orders WHERE tenant_id = %L)',
            v_backup_schema,
            v_fk_col,
            v_tenant_id
          );
        END IF;
      END;
    END;
  END IF;
  IF to_regclass('public.job_order_quality') IS NOT NULL THEN
    -- Some deployments do not have tenant_id on this table; still try tenant filter first.
    BEGIN
      EXECUTE format('CREATE TABLE %I.job_order_quality AS SELECT * FROM job_order_quality WHERE tenant_id = %L', v_backup_schema, v_tenant_id);
    EXCEPTION WHEN undefined_column THEN
      DECLARE
        v_fk_col text;
      BEGIN
        SELECT CASE
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'job_order_quality' AND column_name = 'job_order_id'
          ) THEN 'job_order_id'
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'job_order_quality' AND column_name = 'production_job_order_id'
          ) THEN 'production_job_order_id'
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'job_order_quality' AND column_name = 'jo_id'
          ) THEN 'jo_id'
          ELSE NULL
        END
        INTO v_fk_col;

        IF v_fk_col IS NULL THEN
          RAISE NOTICE 'Skipping job_order_quality backup: no tenant_id and no job-order FK column found.';
        ELSE
          EXECUTE format(
            'CREATE TABLE %I.job_order_quality AS '
            'SELECT q.* '
            'FROM job_order_quality q '
            'WHERE q.%I IN (SELECT id FROM production_job_orders WHERE tenant_id = %L)',
            v_backup_schema,
            v_fk_col,
            v_tenant_id
          );
        END IF;
      END;
    END;
  END IF;

  IF to_regclass('public.uid_registry') IS NOT NULL THEN
    EXECUTE format('CREATE TABLE %I.uid_registry AS SELECT * FROM uid_registry WHERE tenant_id = %L', v_backup_schema, v_tenant_id);
  END IF;
  IF to_regclass('public.stock_entries') IS NOT NULL THEN
    EXECUTE format('CREATE TABLE %I.stock_entries AS SELECT * FROM stock_entries WHERE tenant_id = %L', v_backup_schema, v_tenant_id);
  END IF;
  IF to_regclass('public.inventory_stock') IS NOT NULL THEN
    EXECUTE format('CREATE TABLE %I.inventory_stock AS SELECT * FROM inventory_stock WHERE tenant_id = %L', v_backup_schema, v_tenant_id);
  END IF;
  IF to_regclass('public.stock_movements') IS NOT NULL THEN
    EXECUTE format('CREATE TABLE %I.stock_movements AS SELECT * FROM stock_movements WHERE tenant_id = %L', v_backup_schema, v_tenant_id);
  END IF;

  IF to_regclass('public.purchase_orders') IS NOT NULL THEN
    EXECUTE format('CREATE TABLE %I.purchase_orders AS SELECT * FROM purchase_orders WHERE tenant_id = %L', v_backup_schema, v_tenant_id);
  END IF;
  IF to_regclass('public.purchase_order_items') IS NOT NULL THEN
    EXECUTE format(
      'CREATE TABLE %I.purchase_order_items AS '
      'SELECT i.* FROM purchase_order_items i '
      'WHERE i.po_id IN (SELECT id FROM purchase_orders WHERE tenant_id = %L)',
      v_backup_schema,
      v_tenant_id
    );
  END IF;
  IF to_regclass('public.purchase_requisitions') IS NOT NULL THEN
    EXECUTE format('CREATE TABLE %I.purchase_requisitions AS SELECT * FROM purchase_requisitions WHERE tenant_id = %L', v_backup_schema, v_tenant_id);
  END IF;
  IF to_regclass('public.purchase_requisition_items') IS NOT NULL THEN
    EXECUTE format(
      'CREATE TABLE %I.purchase_requisition_items AS '
      'SELECT i.* FROM purchase_requisition_items i '
      'WHERE i.pr_id IN (SELECT id FROM purchase_requisitions WHERE tenant_id = %L)',
      v_backup_schema,
      v_tenant_id
    );
  END IF;

  IF to_regclass('public.grns') IS NOT NULL THEN
    EXECUTE format('CREATE TABLE %I.grns AS SELECT * FROM grns WHERE tenant_id = %L', v_backup_schema, v_tenant_id);
  END IF;
  IF to_regclass('public.grn_items') IS NOT NULL THEN
    BEGIN
      EXECUTE format(
        'CREATE TABLE %I.grn_items AS '
        'SELECT i.* FROM grn_items i '
        'WHERE i.grn_id IN (SELECT id FROM grns WHERE tenant_id = %L)',
        v_backup_schema,
        v_tenant_id
      );
    EXCEPTION WHEN undefined_column THEN
      -- fallback: if schema differs, skip
      RAISE NOTICE 'Skipping grn_items backup due to schema mismatch.';
    END;
  END IF;

  RAISE NOTICE '✅ Backup complete (schema=%). Proceeding to delete...', v_backup_schema;

  -- -------------------------
  -- 2) DELETE transactional data (tenant-scoped)
  -- -------------------------

  -- UIDs + aux
  IF to_regclass('public.uid_deployment') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM uid_deployment WHERE tenant_id = $1' USING v_tenant_id;
    EXCEPTION WHEN undefined_column THEN
      EXECUTE 'DELETE FROM uid_deployment WHERE uid_id IN (SELECT id FROM uid_registry WHERE tenant_id = $1)' USING v_tenant_id;
    END;
  END IF;
  IF to_regclass('public.uid_lifecycle_events') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM uid_lifecycle_events WHERE tenant_id = $1' USING v_tenant_id;
    EXCEPTION WHEN undefined_column THEN
      EXECUTE 'DELETE FROM uid_lifecycle_events WHERE uid_id IN (SELECT id FROM uid_registry WHERE tenant_id = $1)' USING v_tenant_id;
    END;
  END IF;
  IF to_regclass('public.uid_hierarchy') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM uid_hierarchy WHERE tenant_id = $1' USING v_tenant_id;
    EXCEPTION WHEN undefined_column THEN
      EXECUTE 'DELETE FROM uid_hierarchy WHERE parent_uid IN (SELECT uid FROM uid_registry WHERE tenant_id = $1)' USING v_tenant_id;
    END;
  END IF;
  IF to_regclass('public.uid_registry') IS NOT NULL THEN
    DELETE FROM uid_registry WHERE tenant_id = v_tenant_id;
  END IF;

  -- Production
  IF to_regclass('public.job_order_quality') IS NOT NULL THEN
    BEGIN
      DELETE FROM job_order_quality WHERE tenant_id = v_tenant_id;
    EXCEPTION WHEN undefined_column THEN
      DECLARE
        v_fk_col text;
      BEGIN
        SELECT CASE
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'job_order_quality' AND column_name = 'job_order_id'
          ) THEN 'job_order_id'
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'job_order_quality' AND column_name = 'production_job_order_id'
          ) THEN 'production_job_order_id'
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'job_order_quality' AND column_name = 'jo_id'
          ) THEN 'jo_id'
          ELSE NULL
        END
        INTO v_fk_col;

        IF v_fk_col IS NULL THEN
          RAISE NOTICE 'Skipping job_order_quality delete: no tenant_id and no job-order FK column found.';
        ELSE
          EXECUTE format(
            'DELETE FROM job_order_quality WHERE %I IN (SELECT id FROM production_job_orders WHERE tenant_id = $1)',
            v_fk_col
          ) USING v_tenant_id;
        END IF;
      END;
    END;
  END IF;
  IF to_regclass('public.job_order_operations') IS NOT NULL THEN
    BEGIN
      DELETE FROM job_order_operations WHERE tenant_id = v_tenant_id;
    EXCEPTION WHEN undefined_column THEN
      DELETE FROM job_order_operations
      WHERE job_order_id IN (SELECT id FROM production_job_orders WHERE tenant_id = v_tenant_id);
    END;
  END IF;
  IF to_regclass('public.job_order_materials') IS NOT NULL THEN
    BEGIN
      DELETE FROM job_order_materials WHERE tenant_id = v_tenant_id;
    EXCEPTION WHEN undefined_column THEN
      DELETE FROM job_order_materials
      WHERE job_order_id IN (SELECT id FROM production_job_orders WHERE tenant_id = v_tenant_id);
    END;
  END IF;
  IF to_regclass('public.production_job_orders') IS NOT NULL THEN
    DELETE FROM production_job_orders WHERE tenant_id = v_tenant_id;
  END IF;

  -- Purchase
  IF to_regclass('public.grn_items') IS NOT NULL AND to_regclass('public.grns') IS NOT NULL THEN
    DELETE FROM grn_items WHERE grn_id IN (SELECT id FROM grns WHERE tenant_id = v_tenant_id);
  END IF;
  IF to_regclass('public.grns') IS NOT NULL THEN
    DELETE FROM grns WHERE tenant_id = v_tenant_id;
  END IF;
  IF to_regclass('public.grn') IS NOT NULL THEN
    -- legacy table
    DELETE FROM grn WHERE tenant_id = v_tenant_id;
  END IF;

  IF to_regclass('public.purchase_order_items') IS NOT NULL THEN
    DELETE FROM purchase_order_items
    WHERE po_id IN (SELECT id FROM purchase_orders WHERE tenant_id = v_tenant_id);
  END IF;
  IF to_regclass('public.purchase_orders') IS NOT NULL THEN
    DELETE FROM purchase_orders WHERE tenant_id = v_tenant_id;
  END IF;

  -- Some schemas link PO -> PR via purchase_orders.pr_id (FK). Ensure POs referencing this tenant's PRs are removed before PR delete.
  IF to_regclass('public.purchase_orders') IS NOT NULL AND to_regclass('public.purchase_requisitions') IS NOT NULL THEN
    IF to_regclass('public.purchase_order_items') IS NOT NULL THEN
      DELETE FROM purchase_order_items
      WHERE po_id IN (
        SELECT po.id
        FROM purchase_orders po
        WHERE po.pr_id IN (SELECT id FROM purchase_requisitions WHERE tenant_id = v_tenant_id)
      );
    END IF;

    DELETE FROM purchase_orders
    WHERE pr_id IN (SELECT id FROM purchase_requisitions WHERE tenant_id = v_tenant_id);
  END IF;

  -- Extra safety: if ANY purchase_orders (even wrong-tenant ones) still reference tenant PRs,
  -- detach the link (only if pr_id is nullable) so PR deletion cannot be blocked.
  IF to_regclass('public.purchase_orders') IS NOT NULL AND to_regclass('public.purchase_requisitions') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'purchase_orders'
        AND column_name = 'pr_id'
        AND is_nullable = 'YES'
    ) THEN
      UPDATE purchase_orders
      SET pr_id = NULL
      WHERE pr_id IN (SELECT id FROM purchase_requisitions WHERE tenant_id = v_tenant_id);
    END IF;
  END IF;

  IF to_regclass('public.purchase_requisition_items') IS NOT NULL THEN
    DELETE FROM purchase_requisition_items
    WHERE pr_id IN (SELECT id FROM purchase_requisitions WHERE tenant_id = v_tenant_id);
  END IF;
  IF to_regclass('public.purchase_requisitions') IS NOT NULL THEN
    DELETE FROM purchase_requisitions WHERE tenant_id = v_tenant_id;
  END IF;

  -- Inventory transactions
  IF to_regclass('public.stock_movements') IS NOT NULL THEN
    DELETE FROM stock_movements WHERE tenant_id = v_tenant_id;
  END IF;
  IF to_regclass('public.stock_entries') IS NOT NULL THEN
    DELETE FROM stock_entries WHERE tenant_id = v_tenant_id;
  END IF;
  IF to_regclass('public.inventory_stock') IS NOT NULL THEN
    DELETE FROM inventory_stock WHERE tenant_id = v_tenant_id;
  END IF;

  RAISE NOTICE '✅ Delete complete. Proceeding to UID policy + stock seed.';

  -- -------------------------
  -- 3) Disable UID tracking in Item Master (TEMP for testing)
  -- -------------------------
  IF to_regclass('public.items') IS NOT NULL THEN
    UPDATE items
    SET
      uid_tracking = false,
      uid_strategy = 'NONE',
      batch_uom = NULL,
      batch_quantity = NULL,
      updated_at = now()
    WHERE tenant_id = v_tenant_id;
  END IF;

  -- -------------------------
  -- 4) Seed stock to 1000 for ALL items (ONE warehouse)
  -- -------------------------

  -- Detect inventory_stock columns
  IF to_regclass('public.inventory_stock') IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_stock' AND column_name='location_id')
      INTO has_inv_location_id;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_stock' AND column_name='quantity')
      INTO has_inv_qty;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_stock' AND column_name='reserved_quantity')
      INTO has_inv_reserved;

    -- available column may be available_quantity or available_qty, and may be a generated column
    has_inv_available := EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='inventory_stock' AND column_name='available_quantity'
    );
    IF has_inv_available THEN
      inv_available_col := 'available_quantity';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='inventory_stock' AND column_name='available_qty'
    ) THEN
      has_inv_available := true;
      inv_available_col := 'available_qty';
    END IF;

    IF has_inv_available THEN
      -- Supabase default: standard_conforming_strings=on; use information_schema.is_generated/generation_expression
      SELECT NOT (
        COALESCE(is_generated, 'NEVER') = 'ALWAYS'
        OR generation_expression IS NOT NULL
      )
      INTO inv_available_writable
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='inventory_stock' AND column_name = inv_available_col
      LIMIT 1;
    END IF;

    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_stock' AND column_name='category')
      INTO has_inv_category;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_stock' AND column_name='updated_at')
      INTO has_inv_updated_at;

    -- If category exists, prepare a correctly-typed literal expression (works for enum / domain / text)
    IF has_inv_category THEN
      DECLARE
        v_udt_schema text;
        v_udt_name text;
        v_data_type text;
      BEGIN
        SELECT udt_schema, udt_name, data_type
        INTO v_udt_schema, v_udt_name, v_data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'inventory_stock'
          AND column_name = 'category'
        LIMIT 1;

        IF v_data_type = 'USER-DEFINED' AND v_udt_schema IS NOT NULL AND v_udt_name IS NOT NULL THEN
          inv_category_expr := quote_literal('RAW_MATERIAL') || '::' || quote_ident(v_udt_schema) || '.' || quote_ident(v_udt_name);
        ELSE
          -- text/varchar/etc
          inv_category_expr := quote_literal('RAW_MATERIAL');
        END IF;
      END;
    END IF;
  END IF;

  -- Detect stock_entries columns
  IF to_regclass('public.stock_entries') IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_entries' AND column_name='allocated_quantity')
      INTO has_se_allocated;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_entries' AND column_name='unit_price')
      INTO has_se_unit_price;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_entries' AND column_name='metadata')
      INTO has_se_metadata;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_entries' AND column_name='created_at')
      INTO has_se_created_at;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_entries' AND column_name='updated_at')
      INTO has_se_updated_at;

    -- Some deployments use available_qty instead of available_quantity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_entries' AND column_name='available_quantity')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_entries' AND column_name='available_qty') THEN
      se_available_col := 'available_qty';
    END IF;

    -- If available column is generated, we must omit it from INSERT
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='stock_entries' AND column_name = se_available_col
    ) THEN
      SELECT NOT (
        COALESCE(is_generated, 'NEVER') = 'ALWAYS'
        OR generation_expression IS NOT NULL
      )
      INTO se_available_writable
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='stock_entries' AND column_name = se_available_col
      LIMIT 1;
    END IF;
  END IF;

  -- inventory_stock (aggregate) - plain INSERT (tenant rows already deleted above, no conflicts possible)
  IF to_regclass('public.inventory_stock') IS NOT NULL THEN
    BEGIN
      EXECUTE format(
        'INSERT INTO inventory_stock (tenant_id, item_id, warehouse_id%s%s%s%s%s) '
        'SELECT $1, i.id, $2%s%s%s%s%s FROM items i WHERE i.tenant_id = $1',
        CASE WHEN has_inv_location_id THEN ', location_id' ELSE '' END,
        CASE WHEN has_inv_available AND inv_available_writable THEN ', ' || quote_ident(inv_available_col) ELSE '' END,
        CASE WHEN has_inv_qty THEN ', quantity' ELSE '' END,
        CASE WHEN has_inv_reserved THEN ', reserved_quantity' ELSE '' END,
        CASE WHEN has_inv_category THEN ', category' ELSE '' END,
        CASE WHEN has_inv_location_id THEN ', NULL' ELSE '' END,
        CASE WHEN has_inv_available AND inv_available_writable THEN ', $3' ELSE '' END,
        CASE WHEN has_inv_qty THEN ', $3' ELSE '' END,
        CASE WHEN has_inv_reserved THEN ', 0' ELSE '' END,
        CASE WHEN has_inv_category THEN ', ' || inv_category_expr ELSE '' END
      )
      USING v_tenant_id, v_seed_warehouse_id, v_seed_qty;

      -- Best-effort updated_at touch
      IF has_inv_updated_at THEN
        UPDATE inventory_stock
        SET updated_at = now()
        WHERE tenant_id = v_tenant_id;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE '⚠️ inventory_stock seed failed: %', SQLERRM;
      RAISE;
    END;
  END IF;

  -- stock_entries (FIFO pool) - plain INSERT (tenant rows already deleted above)
  IF to_regclass('public.stock_entries') IS NOT NULL THEN
    BEGIN
      EXECUTE format(
        'INSERT INTO stock_entries (tenant_id, item_id, warehouse_id, quantity%s%s%s%s%s%s) '
        'SELECT $1, i.id, $2, $3%s%s%s%s%s%s FROM items i WHERE i.tenant_id = $1',
        CASE WHEN se_available_writable THEN ', ' || quote_ident(se_available_col) ELSE '' END,
        CASE WHEN has_se_allocated THEN ', allocated_quantity' ELSE '' END,
        CASE WHEN has_se_unit_price THEN ', unit_price' ELSE '' END,
        CASE WHEN has_se_metadata THEN ', metadata' ELSE '' END,
        CASE WHEN has_se_created_at THEN ', created_at' ELSE '' END,
        CASE WHEN has_se_updated_at THEN ', updated_at' ELSE '' END,
        CASE WHEN se_available_writable THEN ', $3' ELSE '' END,
        CASE WHEN has_se_allocated THEN ', 0' ELSE '' END,
        CASE WHEN has_se_unit_price THEN ', 0' ELSE '' END,
        CASE WHEN has_se_metadata THEN ', jsonb_build_object(''seeded_for_testing'', true, ''seed_qty'', $3, ''seeded_at'', now()::text, ''note'', ''WIPE_PROD_TENANT_AND_SEED_STOCK_1000.sql'')' ELSE '' END,
        CASE WHEN has_se_created_at THEN ', now()' ELSE '' END,
        CASE WHEN has_se_updated_at THEN ', now()' ELSE '' END
      )
      USING v_tenant_id, v_seed_warehouse_id, v_seed_qty;
    EXCEPTION WHEN others THEN
      RAISE NOTICE '⚠️ stock_entries seed failed: %', SQLERRM;
      RAISE;
    END;
  END IF;

  RAISE NOTICE '✅ DONE. Tenant wiped + stock seeded to % in warehouse %.', v_seed_qty, v_seed_warehouse_id;
  RAISE NOTICE 'Backup schema created: %', v_backup_schema;
END $$;
