-- Delete ONLY PR / PO / Job Orders / GRN transactional data (tenant-scoped)
--
-- ✅ Keeps master data (items/vendors/customers/etc.)
-- ✅ Does NOT delete BOMs or item masters (including sub-assemblies)
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
  v_delete_inventory_stock boolean := true;
  v_stock_entries_has_created_from boolean;
  v_items_has_type boolean;
  v_items_has_category boolean;
  v_items_has_sub_category boolean;
  v_subassembly_item_condition text;
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

  -- Detect optional columns/tables safely (some deployments differ)
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stock_entries'
      AND column_name = 'created_from'
  ) INTO v_stock_entries_has_created_from;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'type'
  ) INTO v_items_has_type;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'category'
  ) INTO v_items_has_category;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'sub_category'
  ) INTO v_items_has_sub_category;

  -- Build a safe sub-assembly selector expression (used inside dynamic SQL)
  v_subassembly_item_condition := '';
  IF v_items_has_type THEN
    v_subassembly_item_condition := v_subassembly_item_condition ||
      'COALESCE(type::text, '''') = ''SUB_ASSEMBLY''';
  END IF;

  IF v_items_has_category THEN
    IF v_subassembly_item_condition <> '' THEN v_subassembly_item_condition := v_subassembly_item_condition || ' OR '; END IF;
    v_subassembly_item_condition := v_subassembly_item_condition ||
      '(COALESCE(category, '''') ILIKE ''%SUB%ASSEMBL%'' OR COALESCE(category, '''') ILIKE ''%SUBASSEMBL%'')';
  END IF;

  IF v_items_has_sub_category THEN
    IF v_subassembly_item_condition <> '' THEN v_subassembly_item_condition := v_subassembly_item_condition || ' OR '; END IF;
    v_subassembly_item_condition := v_subassembly_item_condition ||
      '(COALESCE(sub_category, '''') ILIKE ''%SUB%ASSEMBL%'' OR COALESCE(sub_category, '''') ILIKE ''%SUBASSEMBL%'')';
  END IF;

  -- If none of the above exists, fall back to BOM headers only.
  IF v_subassembly_item_condition = '' THEN
    v_subassembly_item_condition := 'FALSE';
  END IF;

  -- =========================
  -- JOB ORDERS (production)
  -- =========================

  IF v_delete_stock_entries THEN
    RAISE NOTICE 'Deleting QC stock_entries (QC_APPROVAL) for tenant...';
    IF v_stock_entries_has_created_from THEN
      DELETE FROM stock_entries
      WHERE tenant_id = v_tenant_id
        AND created_from = 'QC_APPROVAL'
        AND (metadata->>'job_order_id') IN (
          SELECT id::text FROM production_job_orders WHERE tenant_id = v_tenant_id
        );
    ELSE
      DELETE FROM stock_entries
      WHERE tenant_id = v_tenant_id
        AND metadata->>'created_from' = 'QC_APPROVAL'
        AND (metadata->>'job_order_id') IN (
          SELECT id::text FROM production_job_orders WHERE tenant_id = v_tenant_id
        );
    END IF;
  END IF;

  IF v_delete_stock_entries THEN
    RAISE NOTICE 'Zeroing SUB_ASSEMBLY stock (setting stock_entries quantities to 0) for tenant...';
    -- IMPORTANT: Only touches stock_entries (does NOT delete items/BOMs).
    -- We target sub-assemblies by:
    -- 1) item type/category tags (if present)
    -- 2) OR any item that has a BOM header (reliable "subassembly" definition)
    EXECUTE (
      'UPDATE stock_entries '
      'SET quantity = 0, available_quantity = 0, allocated_quantity = 0 '
      'WHERE tenant_id = $1 '
      '  AND item_id IN ( '
      '    SELECT i.id FROM items i '
      '    WHERE i.tenant_id = $1 '
      '      AND (' || v_subassembly_item_condition || ') '
      '    UNION '
      '    SELECT bh.item_id FROM bom_headers bh '
      '    WHERE bh.tenant_id = $1 '
      '  )'
    ) USING v_tenant_id;
  END IF;

  IF v_delete_stock_entries AND v_delete_inventory_stock AND to_regclass('public.inventory_stock') IS NOT NULL THEN
    RAISE NOTICE 'Deleting inventory_stock rows for tenant (keeps stock_entries as the source of truth after cleanup)...';
    DELETE FROM inventory_stock WHERE tenant_id = v_tenant_id;
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
    IF v_stock_entries_has_created_from THEN
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
 