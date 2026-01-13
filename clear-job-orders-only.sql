-- Delete ONLY Job Orders (keeps PR/PO/GRN intact)
--
-- ✅ Keeps master data (items/vendors/customers/etc.)
-- ✅ Keeps PRs, POs, GRNs and their stock
-- ✅ Deletes: production_job_orders + materials + operations + UIDs + QC stock
-- ✅ Zeros sub-assembly stock (so they can be re-made)
--
-- HOW TO USE:
-- 1) Set v_tenant_id below.
-- 2) Run in Supabase SQL Editor.

DO $$
DECLARE
  v_tenant_id_text text := 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
  v_tenant_id UUID;
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

  RAISE NOTICE 'Clearing Job Orders ONLY for tenant: %', v_tenant_id;

  -- Detect optional columns safely
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

  -- Build sub-assembly selector
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

  IF v_subassembly_item_condition = '' THEN
    v_subassembly_item_condition := 'FALSE';
  END IF;

  -- =========================
  -- 1. RESTORE consumed raw materials (before deleting job orders)
  -- =========================
  RAISE NOTICE 'Restoring consumed raw materials from job_order_materials...';
  
  -- Add back issued quantities to stock_entries (issued_quantity = consumed)
  UPDATE stock_entries se
  SET 
    quantity = se.quantity + consumed.total_consumed,
    available_quantity = se.available_quantity + consumed.total_consumed
  FROM (
    SELECT jom.item_id, SUM(COALESCE(jom.issued_quantity, 0) - COALESCE(jom.returned_quantity, 0)) as total_consumed
    FROM job_order_materials jom
    JOIN production_job_orders jo ON jo.id = jom.job_order_id
    WHERE jo.tenant_id = v_tenant_id
      AND jom.issued_quantity > 0
    GROUP BY jom.item_id
  ) consumed
  WHERE se.tenant_id = v_tenant_id
    AND se.item_id = consumed.item_id;

  -- Also restore in inventory_stock if it exists
  IF to_regclass('public.inventory_stock') IS NOT NULL THEN
    RAISE NOTICE 'Restoring consumed raw materials in inventory_stock...';
    UPDATE inventory_stock inv
    SET quantity = inv.quantity + consumed.total_consumed
    FROM (
      SELECT jom.item_id, SUM(COALESCE(jom.issued_quantity, 0) - COALESCE(jom.returned_quantity, 0)) as total_consumed
      FROM job_order_materials jom
      JOIN production_job_orders jo ON jo.id = jom.job_order_id
      WHERE jo.tenant_id = v_tenant_id
        AND jom.issued_quantity > 0
      GROUP BY jom.item_id
    ) consumed
    WHERE inv.tenant_id = v_tenant_id
      AND inv.item_id = consumed.item_id;
  END IF;

  -- =========================
  -- 2. Delete QC stock entries (from job orders)
  -- =========================
  RAISE NOTICE 'Deleting QC stock_entries for tenant...';
  DELETE FROM stock_entries
  WHERE tenant_id = v_tenant_id
    AND metadata->>'created_from' = 'QC_APPROVAL';

  -- =========================
  -- 2. Zero out sub-assembly stock (so they need to be re-made)
  -- =========================
  RAISE NOTICE 'Zeroing SUB_ASSEMBLY stock for tenant...';
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

  -- Also zero inventory_stock for sub-assemblies (only quantity column exists)
  IF to_regclass('public.inventory_stock') IS NOT NULL THEN
    RAISE NOTICE 'Zeroing inventory_stock for sub-assemblies...';
    EXECUTE (
      'UPDATE inventory_stock '
      'SET quantity = 0 '
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

  -- =========================
  -- 3. Delete UIDs (linked to job orders)
  -- =========================
  IF to_regclass('public.product_deployment_history') IS NOT NULL THEN
    RAISE NOTICE 'Deleting product_deployment_history...';
    DELETE FROM product_deployment_history WHERE tenant_id = v_tenant_id;
  END IF;

  IF to_regclass('public.uid_deployment') IS NOT NULL THEN
    RAISE NOTICE 'Deleting uid_deployment...';
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

  -- Delete only job-order-linked UIDs (keep GRN UIDs)
  RAISE NOTICE 'Deleting job-order UIDs from uid_registry...';
  DELETE FROM uid_registry 
  WHERE tenant_id = v_tenant_id 
    AND job_order_id IS NOT NULL;

  -- =========================
  -- 4. Delete Job Orders
  -- =========================
  RAISE NOTICE 'Deleting job_order_operations...';
  DELETE FROM job_order_operations
  WHERE job_order_id IN (SELECT id FROM production_job_orders WHERE tenant_id = v_tenant_id);

  RAISE NOTICE 'Deleting job_order_materials...';
  DELETE FROM job_order_materials
  WHERE job_order_id IN (SELECT id FROM production_job_orders WHERE tenant_id = v_tenant_id);

  RAISE NOTICE 'Deleting production_job_orders...';
  DELETE FROM production_job_orders WHERE tenant_id = v_tenant_id;

  RAISE NOTICE '✅ Done! Job Orders cleared. PRs/POs/GRNs and raw material stock preserved.';
  RAISE NOTICE '👉 Now create a new Smart Job Order to test the fix.';
END $$;
