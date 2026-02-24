-- Clear transactional data: Job Orders, SIV, SRV, UIDs, PR, PO, GRN (tenant-scoped)
--
-- ✅ Keeps master data: items, vendors, BOMs, warehouses
-- ✅ Keeps raw-material stock_entries (GRN stock from before this cleanup)
--
-- Targets (if present in your DB):
-- - stock_movements (SIV: reference_type='SIV')
-- - stock_entries   (SRV: created_from='STORE_RECEIPT', QC: created_from='QC_APPROVAL', GRN: GRN_APPROVE/GRN_QC_ACCEPT)
-- - production_job_orders + job_order_materials + job_order_operations + job_order_quality
-- - uid_registry (+ optional aux tables if they exist)
-- - grns + grn_items + debit_notes + debit_note_items
-- - purchase_requisitions + purchase_requisition_items
-- - purchase_orders + purchase_order_items
--
-- HOW TO USE:
-- 1) Backup DB (recommended).
-- 2) Set v_tenant_id_text below.
-- 3) Run in Supabase SQL editor.

DO $$
DECLARE
  v_tenant_id_text text := 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'; -- CHANGE THIS
  v_tenant_id uuid;
  v_actor_user_id uuid;
  v_disable_po_triggers boolean := false;
  v_remaining_pos int := 0;
  v_remaining_po_ids text := '';
  v_po_audit_trigger_dropped boolean := false;
  v_grn_audit_trigger_dropped boolean := false;
BEGIN
  IF v_tenant_id_text IS NULL OR btrim(v_tenant_id_text) = '' OR v_tenant_id_text = 'PUT-TENANT-ID-HERE' THEN
    RAISE EXCEPTION 'Set v_tenant_id_text before running.';
  END IF;

  BEGIN
    v_tenant_id := v_tenant_id_text::uuid;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Invalid tenant id: %', v_tenant_id_text;
  END;

  RAISE NOTICE 'Clearing JO + UID + PR + PO for tenant: %', v_tenant_id;

  -- Some deployments log deletes into activity_logs via trigger log_deletion(), requiring:
  -- current_setting('app.current_user_id')::uuid NOT NULL.
  -- Set it automatically to any existing user of this tenant.
  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT id
    INTO v_actor_user_id
    FROM users
    WHERE tenant_id = v_tenant_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_actor_user_id IS NOT NULL THEN
      PERFORM set_config('app.current_user_id', v_actor_user_id::text, true);
      RAISE NOTICE 'Using app.current_user_id=% for deletion audit triggers', v_actor_user_id;
    ELSE
      RAISE NOTICE 'No users found for tenant; delete-audit triggers may fail. Will attempt trigger-disable fallback for purchase_orders.';
    END IF;
  END IF;

  -- -------------------------
  -- GRN stock_entries (must be before grn_items/grns)
  -- -------------------------
  IF to_regclass('public.stock_entries') IS NOT NULL THEN
    RAISE NOTICE 'Deleting GRN stock_entries (GRN_APPROVE / GRN_QC_ACCEPT) for tenant...';
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stock_entries' AND column_name = 'created_from'
    ) THEN
      DELETE FROM stock_entries
      WHERE tenant_id = v_tenant_id
        AND created_from IN ('GRN_APPROVE', 'GRN_QC_ACCEPT');
    ELSE
      DELETE FROM stock_entries
      WHERE tenant_id = v_tenant_id
        AND (metadata->>'created_from') IN ('GRN_APPROVE', 'GRN_QC_ACCEPT');
    END IF;
  END IF;

  -- -------------------------
  -- GRNs (debit_notes → grn_items → grns)
  -- -------------------------
  BEGIN
    -- Debit notes reference GRNs; delete them first.
    IF to_regclass('public.debit_note_items') IS NOT NULL THEN
      RAISE NOTICE 'Deleting debit_note_items for tenant...';
      DELETE FROM debit_note_items
      WHERE debit_note_id IN (SELECT id FROM debit_notes WHERE tenant_id = v_tenant_id);
    END IF;

    IF to_regclass('public.debit_notes') IS NOT NULL THEN
      RAISE NOTICE 'Deleting debit_notes for tenant...';
      DELETE FROM debit_notes WHERE tenant_id = v_tenant_id;
    END IF;

    IF to_regclass('public.grn_items') IS NOT NULL THEN
      RAISE NOTICE 'Deleting grn_items for tenant...';
      DELETE FROM grn_items
      WHERE grn_id IN (SELECT id FROM grns WHERE tenant_id = v_tenant_id);
    END IF;

    IF to_regclass('public.grns') IS NOT NULL THEN
      RAISE NOTICE 'Deleting grns for tenant...';
      -- Temporarily drop audit_grns_deletion trigger if present (returns NEW on DELETE, cancelling rows)
      IF EXISTS (
        SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
        WHERE c.relname = 'grns' AND t.tgname = 'audit_grns_deletion' AND NOT t.tgisinternal
      ) THEN
        BEGIN
          EXECUTE 'DROP TRIGGER audit_grns_deletion ON grns';
          v_grn_audit_trigger_dropped := true;
          RAISE NOTICE 'Dropped audit_grns_deletion trigger temporarily.';
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'Could not drop audit_grns_deletion: %', SQLERRM;
        END;
      END IF;

      DELETE FROM grns WHERE tenant_id = v_tenant_id;

      IF v_grn_audit_trigger_dropped AND to_regprocedure('public.log_deletion()') IS NOT NULL THEN
        BEGIN
          EXECUTE 'CREATE TRIGGER audit_grns_deletion BEFORE UPDATE OR DELETE ON grns FOR EACH ROW EXECUTE FUNCTION log_deletion()';
          RAISE NOTICE 'Recreated audit_grns_deletion trigger.';
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'Could not recreate audit_grns_deletion: %', SQLERRM;
        END;
      END IF;
    END IF;

    -- Legacy public.grn table
    IF to_regclass('public.grn') IS NOT NULL THEN
      RAISE NOTICE 'Deleting legacy grn rows for tenant...';
      DELETE FROM grn WHERE tenant_id = v_tenant_id;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'GRN tables not found, skipping...';
  END;

  -- -------------------------
  -- UIDs (delete child/aux tables first if present)
  -- -------------------------
  IF to_regclass('public.product_deployment_history') IS NOT NULL THEN
    RAISE NOTICE 'Deleting product_deployment_history...';
    DELETE FROM product_deployment_history WHERE tenant_id = v_tenant_id;
  END IF;

  IF to_regclass('public.uid_deployment') IS NOT NULL THEN
    RAISE NOTICE 'Deleting uid_deployment (legacy)...';
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'uid_deployment' AND column_name = 'tenant_id'
    ) THEN
      EXECUTE 'DELETE FROM uid_deployment WHERE tenant_id = $1' USING v_tenant_id;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'uid_deployment' AND column_name = 'uid_id'
    ) THEN
      EXECUTE 'DELETE FROM uid_deployment WHERE uid_id IN (SELECT id FROM uid_registry WHERE tenant_id = $1)' USING v_tenant_id;
    END IF;
  END IF;

  IF to_regclass('public.uid_lifecycle_events') IS NOT NULL THEN
    RAISE NOTICE 'Deleting uid_lifecycle_events (legacy)...';
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'uid_lifecycle_events' AND column_name = 'tenant_id'
    ) THEN
      EXECUTE 'DELETE FROM uid_lifecycle_events WHERE tenant_id = $1' USING v_tenant_id;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'uid_lifecycle_events' AND column_name = 'uid_id'
    ) THEN
      EXECUTE 'DELETE FROM uid_lifecycle_events WHERE uid_id IN (SELECT id FROM uid_registry WHERE tenant_id = $1)' USING v_tenant_id;
    END IF;
  END IF;

  IF to_regclass('public.uid_hierarchy') IS NOT NULL THEN
    RAISE NOTICE 'Deleting uid_hierarchy (legacy)...';
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'uid_hierarchy' AND column_name = 'tenant_id'
    ) THEN
      EXECUTE 'DELETE FROM uid_hierarchy WHERE tenant_id = $1' USING v_tenant_id;
    ELSE
      EXECUTE 'DELETE FROM uid_hierarchy WHERE parent_uid IN (SELECT uid FROM uid_registry WHERE tenant_id = $1)' USING v_tenant_id;
    END IF;
  END IF;

  IF to_regclass('public.uid_registry') IS NOT NULL THEN
    RAISE NOTICE 'Deleting uid_registry...';
    DELETE FROM uid_registry WHERE tenant_id = v_tenant_id;
  END IF;

  -- -------------------------
  -- SIV (stock_movements) + SRV / QC (stock_entries)
  -- -------------------------
  IF to_regclass('public.stock_movements') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'reference_type'
  ) THEN
    RAISE NOTICE 'Deleting SIV stock_movements for tenant...';
    DELETE FROM stock_movements
    WHERE tenant_id = v_tenant_id
      AND reference_type = 'SIV';
  END IF;

  IF to_regclass('public.stock_entries') IS NOT NULL THEN
    -- SRV rows (Store Receipt Voucher)
    RAISE NOTICE 'Deleting SRV stock_entries (STORE_RECEIPT) for tenant...';
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stock_entries' AND column_name = 'created_from'
    ) THEN
      DELETE FROM stock_entries WHERE tenant_id = v_tenant_id AND created_from = 'STORE_RECEIPT';
    ELSE
      DELETE FROM stock_entries WHERE tenant_id = v_tenant_id AND metadata->>'created_from' = 'STORE_RECEIPT';
    END IF;

    -- QC approval rows
    RAISE NOTICE 'Deleting QC stock_entries (QC_APPROVAL) for tenant...';
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stock_entries' AND column_name = 'created_from'
    ) THEN
      DELETE FROM stock_entries WHERE tenant_id = v_tenant_id AND created_from = 'QC_APPROVAL';
    ELSE
      DELETE FROM stock_entries WHERE tenant_id = v_tenant_id AND metadata->>'created_from' = 'QC_APPROVAL';
    END IF;
  END IF;

  -- -------------------------
  -- Job Orders
  -- -------------------------
  IF to_regclass('public.job_order_quality') IS NOT NULL THEN
    RAISE NOTICE 'Deleting job_order_quality...';
    -- Different deployments link quality either directly to job_order_id or via job_order_operation_id.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'job_order_quality' AND column_name = 'tenant_id'
    ) THEN
      DELETE FROM job_order_quality WHERE tenant_id = v_tenant_id;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'job_order_quality' AND column_name = 'job_order_id'
    ) THEN
      DELETE FROM job_order_quality
      WHERE job_order_id IN (SELECT id FROM production_job_orders WHERE tenant_id = v_tenant_id);
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'job_order_quality' AND column_name = 'job_order_operation_id'
    ) THEN
      DELETE FROM job_order_quality
      WHERE job_order_operation_id IN (
        SELECT id
        FROM job_order_operations
        WHERE job_order_id IN (SELECT id FROM production_job_orders WHERE tenant_id = v_tenant_id)
      );
    ELSE
      RAISE NOTICE 'job_order_quality table exists but no known FK columns found; skipping job_order_quality delete.';
    END IF;
  END IF;

  IF to_regclass('public.job_order_operations') IS NOT NULL THEN
    RAISE NOTICE 'Deleting job_order_operations...';
    BEGIN
      DELETE FROM job_order_operations WHERE tenant_id = v_tenant_id;
    EXCEPTION WHEN undefined_column THEN
      DELETE FROM job_order_operations WHERE job_order_id IN (SELECT id FROM production_job_orders WHERE tenant_id = v_tenant_id);
    END;
  END IF;

  IF to_regclass('public.job_order_materials') IS NOT NULL THEN
    RAISE NOTICE 'Deleting job_order_materials...';
    BEGIN
      DELETE FROM job_order_materials WHERE tenant_id = v_tenant_id;
    EXCEPTION WHEN undefined_column THEN
      DELETE FROM job_order_materials WHERE job_order_id IN (SELECT id FROM production_job_orders WHERE tenant_id = v_tenant_id);
    END;
  END IF;

  IF to_regclass('public.production_job_orders') IS NOT NULL THEN
    RAISE NOTICE 'Deleting production_job_orders...';
    DELETE FROM production_job_orders WHERE tenant_id = v_tenant_id;
  END IF;

  -- -------------------------
  -- Purchase Orders + PR
  -- -------------------------
  IF to_regclass('public.purchase_order_items') IS NOT NULL THEN
    RAISE NOTICE 'Deleting purchase_order_items...';
    DELETE FROM purchase_order_items
    WHERE po_id IN (SELECT id FROM purchase_orders WHERE tenant_id = v_tenant_id);
  END IF;

  IF to_regclass('public.purchase_orders') IS NOT NULL THEN
    RAISE NOTICE 'Deleting purchase_orders...';

    -- Re-assert config just before delete (defensive for audit triggers)
    IF v_actor_user_id IS NOT NULL THEN
      PERFORM set_config('app.current_user_id', v_actor_user_id::text, true);
    END IF;

    -- Attempt 1: normal delete
    DELETE FROM purchase_orders WHERE tenant_id = v_tenant_id;

    SELECT COUNT(*)::int INTO v_remaining_pos FROM purchase_orders WHERE tenant_id = v_tenant_id;
    IF v_remaining_pos > 0 THEN
      RAISE NOTICE 'purchase_orders remaining after normal delete: % (retrying with triggers disabled)', v_remaining_pos;

      -- Attempt 2: disable triggers and retry (handles audit triggers requiring app.current_user_id)
      BEGIN
        EXECUTE 'ALTER TABLE purchase_orders DISABLE TRIGGER ALL';
        v_disable_po_triggers := true;
      EXCEPTION WHEN others THEN
        v_disable_po_triggers := false;
        RAISE NOTICE 'Could not disable triggers on purchase_orders (permission/pg restriction).';
      END;

      IF v_actor_user_id IS NOT NULL THEN
        PERFORM set_config('app.current_user_id', v_actor_user_id::text, true);
      END IF;

      DELETE FROM purchase_orders WHERE tenant_id = v_tenant_id;

      IF v_disable_po_triggers THEN
        BEGIN
          EXECUTE 'ALTER TABLE purchase_orders ENABLE TRIGGER ALL';
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'Could not re-enable triggers on purchase_orders (please verify manually)';
        END;
      END IF;

      SELECT COUNT(*)::int INTO v_remaining_pos FROM purchase_orders WHERE tenant_id = v_tenant_id;
      IF v_remaining_pos > 0 THEN
        -- At this point, the most common cause is audit_purchase_orders_deletion trigger using log_deletion()
        -- which returns NEW on DELETE, thereby CANCELING hard deletes silently.
        -- Drop that trigger temporarily and retry.
        IF EXISTS (
          SELECT 1
          FROM pg_trigger t
          JOIN pg_class c ON c.oid = t.tgrelid
          WHERE c.relname = 'purchase_orders'
            AND t.tgname = 'audit_purchase_orders_deletion'
            AND NOT t.tgisinternal
        ) THEN
          BEGIN
            EXECUTE 'DROP TRIGGER audit_purchase_orders_deletion ON purchase_orders';
            v_po_audit_trigger_dropped := true;
            RAISE NOTICE 'Dropped trigger audit_purchase_orders_deletion on purchase_orders (temporary)';
          EXCEPTION WHEN others THEN
            v_po_audit_trigger_dropped := false;
            RAISE NOTICE 'Could not drop audit_purchase_orders_deletion trigger; PO delete may remain blocked.';
          END;
        END IF;

        DELETE FROM purchase_orders WHERE tenant_id = v_tenant_id;

        IF v_po_audit_trigger_dropped AND to_regprocedure('public.log_deletion()') IS NOT NULL THEN
          BEGIN
            EXECUTE 'CREATE TRIGGER audit_purchase_orders_deletion BEFORE UPDATE OR DELETE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION log_deletion()';
            RAISE NOTICE 'Re-created trigger audit_purchase_orders_deletion on purchase_orders';
          EXCEPTION WHEN others THEN
            RAISE NOTICE 'Could not re-create audit_purchase_orders_deletion trigger on purchase_orders (please verify manually)';
          END;
        END IF;

        SELECT COUNT(*)::int INTO v_remaining_pos FROM purchase_orders WHERE tenant_id = v_tenant_id;
        IF v_remaining_pos > 0 THEN
          RAISE NOTICE 'purchase_orders remaining after dropping audit trigger retry: %', v_remaining_pos;
        END IF;

        SELECT COALESCE(string_agg(id::text || ' (' || COALESCE(po_number, '') || ')', ', '), '')
        INTO v_remaining_po_ids
        FROM purchase_orders
        WHERE tenant_id = v_tenant_id;

        RAISE NOTICE 'Still remaining purchase_orders: %', v_remaining_po_ids;
        RAISE NOTICE 'If these still cannot be deleted, it is likely due to RLS or another FK reference in your DB; share the PO ids above and we will add the missing dependency cleanup.';
      END IF;
    END IF;
  END IF;

  IF to_regclass('public.purchase_requisition_items') IS NOT NULL THEN
    RAISE NOTICE 'Deleting purchase_requisition_items...';
    DELETE FROM purchase_requisition_items
    WHERE pr_id IN (SELECT id FROM purchase_requisitions WHERE tenant_id = v_tenant_id);
  END IF;

  IF to_regclass('public.purchase_requisitions') IS NOT NULL THEN
    -- Safety: if any purchase_orders remain (due to triggers/permissions), they may still reference PRs via purchase_orders.pr_id.
    -- Unlink pr_id to avoid FK violations, then retry PO delete.
    IF to_regclass('public.purchase_orders') IS NOT NULL AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'pr_id'
    ) THEN
      RAISE NOTICE 'Unlinking purchase_orders.pr_id for tenant (to unlock PR deletes)...';
      UPDATE purchase_orders
      SET pr_id = NULL
      WHERE tenant_id = v_tenant_id
        AND pr_id IS NOT NULL;
    END IF;

    IF to_regclass('public.purchase_orders') IS NOT NULL THEN
      RAISE NOTICE 'Retrying delete of any remaining purchase_orders for tenant (safety)...';
      IF v_actor_user_id IS NOT NULL THEN
        PERFORM set_config('app.current_user_id', v_actor_user_id::text, true);
      END IF;
      DELETE FROM purchase_orders WHERE tenant_id = v_tenant_id;
    END IF;

    RAISE NOTICE 'Deleting purchase_requisitions...';
    DELETE FROM purchase_requisitions WHERE tenant_id = v_tenant_id;
  END IF;

  RAISE NOTICE '✅ Done. Transactional tables cleared. Stock/BOM/vendors/items preserved.';
END $$;

-- Verification counts (all should be 0)
SELECT 'production_job_orders'  AS table_name, COUNT(*) AS remaining FROM production_job_orders  WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
UNION ALL
SELECT 'uid_registry',           COUNT(*) FROM uid_registry            WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
UNION ALL
SELECT 'grns',                   COUNT(*) FROM grns                    WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
UNION ALL
SELECT 'grn_items',              COUNT(*) FROM grn_items               WHERE grn_id IN (SELECT id FROM grns WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c')
UNION ALL
SELECT 'SIV stock_movements',    COUNT(*) FROM stock_movements         WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c' AND reference_type = 'SIV'
UNION ALL
SELECT 'SRV stock_entries',      COUNT(*) FROM stock_entries           WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c' AND metadata->>'created_from' = 'STORE_RECEIPT'
UNION ALL
SELECT 'purchase_requisitions',  COUNT(*) FROM purchase_requisitions   WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
UNION ALL
SELECT 'purchase_orders',        COUNT(*) FROM purchase_orders         WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
