-- Delete ONLY PR / PO / Job Orders / GRN transactional data (tenant-scoped)
--
-- ✅ Keeps master data (items/vendors/customers/etc.)
-- ✅ Targets: purchase_requisitions(+items), purchase_orders(+items), grns(+items), production_job_orders(+materials/+operations)
-- ⚠️ Also removes dependent transactional rows that block deletes (e.g. debit_notes for GRNs)
--
-- HOW TO USE:
-- 1) BACKUP your database (Supabase has backups / point-in-time options).
-- 2) Set v_tenant_id below.
-- 3) Run in Supabase SQL Editor.
--
-- Notes:
-- - This script is currently set to delete ALL UIDs for the tenant (v_delete_uids := true). Set it to false if you want to keep UIDs.
-- - If you want inventory to revert, keep v_delete_stock_entries := true.

DO $$
DECLARE
  v_tenant_id_text text := 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
  v_tenant_id UUID;
  v_delete_uids boolean := true;
  v_delete_stock_entries boolean := true;
BEGIN
  IF v_tenant_id_text IS NULL OR btrim(v_tenant_id_text) = '' OR v_tenant_id_text = 'PUT-TENANT-ID-HERE' THEN
    RAISE EXCEPTION 'Set v_tenant_id_text before running.';
  END IF;

  BEGIN
    v_tenant_id := v_tenant_id_text::uuid;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Invalid tenant id: %', v_tenant_id_text;
  END;

  RAISE NOTICE 'Deleting PR/PO/JO/GRN transactions for tenant: %', v_tenant_id;

  -- =========================
  -- JOB ORDERS (production)
  -- =========================

  IF v_delete_stock_entries THEN
    RAISE NOTICE 'Deleting QC stock_entries (QC_APPROVAL) for tenant...';
    DELETE FROM stock_entries
    WHERE tenant_id = v_tenant_id
      AND metadata->>'created_from' = 'QC_APPROVAL'
      AND (metadata->>'job_order_id') IN (
        SELECT id::text FROM production_job_orders WHERE tenant_id = v_tenant_id
      );
  END IF;

  IF v_delete_uids THEN
    -- UID deletion is tenant-wide (not only job-order/grn-linked), but we delete
    -- any child/aux tables first to avoid FK violations.

    IF to_regclass('public.product_deployment_history') IS NOT NULL THEN
      RAISE NOTICE 'Deleting product_deployment_history for tenant...';
      DELETE FROM product_deployment_history WHERE tenant_id = v_tenant_id;
    END IF;

    IF to_regclass('public.uid_deployment') IS NOT NULL THEN
      RAISE NOTICE 'Deleting uid_deployment for tenant (legacy)...';
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
      ELSE
        EXECUTE 'DELETE FROM uid_deployment';
      END IF;
    END IF;

    IF to_regclass('public.uid_lifecycle_events') IS NOT NULL THEN
      RAISE NOTICE 'Deleting uid_lifecycle_events for tenant (legacy)...';
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'uid_lifecycle_events' AND column_name = 'tenant_id'
      ) THEN
        EXECUTE 'DELETE FROM uid_lifecycle_events WHERE tenant_id = $1' USING v_tenant_id;
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'uid_lifecycle_events' AND column_name = 'uid_id'
      ) THEN
        EXECUTE 'DELETE FROM uid_lifecycle_events WHERE uid_id IN (SELECT id FROM uids WHERE tenant_id = $1)' USING v_tenant_id;
      ELSE
        EXECUTE 'DELETE FROM uid_lifecycle_events';
      END IF;
    END IF;

    IF to_regclass('public.uids') IS NOT NULL THEN
      RAISE NOTICE 'Deleting uids for tenant (legacy)...';
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'uids' AND column_name = 'tenant_id'
      ) THEN
        EXECUTE 'DELETE FROM uids WHERE tenant_id = $1' USING v_tenant_id;
      ELSE
        EXECUTE 'DELETE FROM uids';
      END IF;
    END IF;

    IF to_regclass('public.grn_uids') IS NOT NULL THEN
      RAISE NOTICE 'Deleting grn_uids for tenant (legacy)...';
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'grn_uids' AND column_name = 'tenant_id'
      ) THEN
        EXECUTE 'DELETE FROM grn_uids WHERE tenant_id = $1' USING v_tenant_id;
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'grn_uids' AND column_name = 'grn_id'
      ) THEN
        EXECUTE 'DELETE FROM grn_uids WHERE grn_id IN (SELECT id FROM grns WHERE tenant_id = $1)' USING v_tenant_id;
      ELSE
        EXECUTE 'DELETE FROM grn_uids';
      END IF;
    END IF;

    RAISE NOTICE 'Deleting uid_registry for tenant...';
    DELETE FROM uid_registry WHERE tenant_id = v_tenant_id;
  END IF;

  RAISE NOTICE 'Deleting job_order_operations...';
  DELETE FROM job_order_operations
  WHERE job_order_id IN (SELECT id FROM production_job_orders WHERE tenant_id = v_tenant_id);

  RAISE NOTICE 'Deleting job_order_materials...';
  DELETE FROM job_order_materials
  WHERE job_order_id IN (SELECT id FROM production_job_orders WHERE tenant_id = v_tenant_id);

  RAISE NOTICE 'Deleting production_job_orders...';
  DELETE FROM production_job_orders WHERE tenant_id = v_tenant_id;

  -- =========================
  -- GRN + PO + PR (purchase)
  -- =========================

  IF v_delete_stock_entries THEN
    RAISE NOTICE 'Deleting GRN stock_entries (GRN_*) for tenant...';
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'stock_entries'
        AND column_name = 'created_from'
    ) THEN
      EXECUTE '
        DELETE FROM stock_entries
        WHERE tenant_id = $1
          AND created_from IN (''GRN_APPROVE'', ''GRN_QC_ACCEPT'')
      ' USING v_tenant_id;
    ELSE
      EXECUTE '
        DELETE FROM stock_entries
        WHERE tenant_id = $1
          AND (metadata->>''created_from'') IN (''GRN_APPROVE'', ''GRN_QC_ACCEPT'')
      ' USING v_tenant_id;
    END IF;
  END IF;

  -- Debit notes depend on GRNs and GRN items.
  IF to_regclass('public.debit_notes') IS NOT NULL THEN
    IF to_regclass('public.debit_note_items') IS NOT NULL THEN
      RAISE NOTICE 'Deleting debit_note_items...';
      DELETE FROM debit_note_items
      WHERE debit_note_id IN (SELECT id FROM debit_notes WHERE tenant_id = v_tenant_id);
    END IF;

    RAISE NOTICE 'Clearing grn_items.debit_note_id links...';
    UPDATE grn_items
    SET debit_note_id = NULL
    WHERE grn_id IN (SELECT id FROM grns WHERE tenant_id = v_tenant_id)
      AND debit_note_id IS NOT NULL;

    RAISE NOTICE 'Deleting debit_notes...';
    DELETE FROM debit_notes WHERE tenant_id = v_tenant_id;
  END IF;

  RAISE NOTICE 'Deleting grn_items...';
  DELETE FROM grn_items
  WHERE grn_id IN (SELECT id FROM grns WHERE tenant_id = v_tenant_id);

  RAISE NOTICE 'Deleting grns...';
  DELETE FROM grns WHERE tenant_id = v_tenant_id;

  -- Legacy table still exists in some environments.
  RAISE NOTICE 'Deleting legacy grn table rows...';
  IF to_regclass('public.grn') IS NOT NULL THEN
    DELETE FROM grn WHERE tenant_id = v_tenant_id;
  END IF;

  RAISE NOTICE 'Deleting purchase_order_items...';
  DELETE FROM purchase_order_items
  WHERE po_id IN (SELECT id FROM purchase_orders WHERE tenant_id = v_tenant_id);

  RAISE NOTICE 'Deleting purchase_orders...';
  DELETE FROM purchase_orders WHERE tenant_id = v_tenant_id;

  RAISE NOTICE 'Deleting purchase_requisition_items...';
  DELETE FROM purchase_requisition_items
  WHERE pr_id IN (SELECT id FROM purchase_requisitions WHERE tenant_id = v_tenant_id);

  RAISE NOTICE 'Deleting purchase_requisitions...';
  DELETE FROM purchase_requisitions WHERE tenant_id = v_tenant_id;

  RAISE NOTICE '✅ Done deleting PR/PO/JO/GRN transactions for tenant: %', v_tenant_id;
END $$;
