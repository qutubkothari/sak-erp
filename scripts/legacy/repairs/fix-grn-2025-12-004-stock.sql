-- Fix stock_entries for GRN-2025-12-004 to match accepted quantity in grn_items
--
-- What it does:
-- 1) Locates GRN by grn_number
-- 2) For each GRN item, computes expected_qty from the accepted-qty column
--    (supports both schemas: accepted_qty OR accepted_quantity)
-- 3) Updates existing stock_entries rows for that GRN (by metadata->>'grn_reference')
-- 4) Inserts missing stock_entries rows if none exist
--
-- Safe to run multiple times (idempotent for inserts via NOT EXISTS; updates overwrite quantities)

DO $$
DECLARE
  v_grn_number TEXT := 'GRN-2025-12-004';
  v_accepted_col TEXT;
  v_unit_price_col TEXT;
  v_has_batch BOOLEAN;
  v_has_po_item_id BOOLEAN;
  v_has_item_code BOOLEAN;
  v_po_table_name TEXT;
  v_po_item_id_col TEXT;
  v_items_code_col TEXT;
  v_items_has_tenant BOOLEAN;
BEGIN
  -- Detect schema differences across environments
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'grn_items' AND column_name = 'accepted_qty'
    ) THEN 'accepted_qty'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'grn_items' AND column_name = 'accepted_quantity'
    ) THEN 'accepted_quantity'
    ELSE NULL
  END INTO v_accepted_col;

  IF v_accepted_col IS NULL THEN
    RAISE EXCEPTION 'Could not find accepted quantity column on grn_items (expected accepted_qty or accepted_quantity)';
  END IF;

  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'grn_items' AND column_name = 'unit_price'
    ) THEN 'unit_price'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'grn_items' AND column_name = 'rate'
    ) THEN 'rate'
    ELSE NULL
  END INTO v_unit_price_col;

  IF v_unit_price_col IS NULL THEN
    -- Not fatal; we can still fix quantities
    v_unit_price_col := '0';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grn_items' AND column_name = 'batch_number'
  ) INTO v_has_batch;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grn_items' AND column_name = 'po_item_id'
  ) INTO v_has_po_item_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grn_items' AND column_name = 'item_code'
  ) INTO v_has_item_code;

  -- Detect PO items table naming (purchase_order_items vs po_items)
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'po_items'
    ) THEN 'po_items'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'purchase_order_items'
    ) THEN 'purchase_order_items'
    ELSE NULL
  END INTO v_po_table_name;

  -- Detect PO item id column name on grn_items (po_item_id vs po_items_id, etc.)
  v_po_item_id_col := CASE WHEN v_has_po_item_id THEN 'po_item_id' ELSE NULL END;

  -- Detect items code column name (code vs item_code)
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'code'
    ) THEN 'code'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'item_code'
    ) THEN 'item_code'
    ELSE NULL
  END INTO v_items_code_col;

  IF v_items_code_col IS NULL THEN
    RAISE EXCEPTION 'Could not find item code column on items (expected code or item_code)';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'tenant_id'
  ) INTO v_items_has_tenant;

  -- Sanity checks for GRN + warehouse
  IF NOT EXISTS (SELECT 1 FROM grns WHERE grn_number = v_grn_number) THEN
    RAISE EXCEPTION 'GRN % not found in grns table', v_grn_number;
  END IF;

  IF EXISTS (SELECT 1 FROM grns WHERE grn_number = v_grn_number AND warehouse_id IS NULL) THEN
    RAISE EXCEPTION 'GRN % has NULL warehouse_id; cannot create stock_entries without warehouse', v_grn_number;
  END IF;

  RAISE NOTICE 'Detected items code column: %', v_items_code_col;

  -- Attempt to disable triggers on grn_items to avoid side effects (e.g. broken triggers referencing item_code)
  BEGIN
    EXECUTE 'ALTER TABLE grn_items DISABLE TRIGGER ALL';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not disable triggers on grn_items (might need superuser): %', SQLERRM;
  END;

  -- ---------------------------------------------------------------------------
  -- Step 0: Repair broken grn_items rows (item_id is required for stock_entries)
  -- ---------------------------------------------------------------------------
  -- Prefer restoring item_id from the related PO line; fall back to items.code.
  IF v_has_po_item_id AND v_po_table_name IS NOT NULL THEN
    RAISE NOTICE 'Attempting to fix item_id from PO items...';
    EXECUTE format($SQL$
      UPDATE grn_items gi
      SET item_id = poi.item_id
      FROM grns g, %I poi
      WHERE g.id = gi.grn_id
        AND poi.id = gi.%I
        AND g.grn_number = %L
        AND gi.item_id IS NULL
        AND gi.%I IS NOT NULL;
    $SQL$,
      v_po_table_name,
      v_po_item_id_col,
      v_grn_number,
      v_po_item_id_col
    );
  END IF;

  IF v_has_item_code THEN
    RAISE NOTICE 'Attempting to fix item_id from item code...';
    EXECUTE format($SQL$
      UPDATE grn_items gi
      SET item_id = it.id
      FROM grns g, items it
      WHERE g.id = gi.grn_id
        AND g.grn_number = %L
        AND gi.item_id IS NULL
        AND gi.item_code IS NOT NULL
        %s
        AND upper(trim(it.%I)) = upper(trim(gi.item_code));
    $SQL$,
      v_grn_number,
      CASE WHEN v_items_has_tenant THEN 'AND it.tenant_id = g.tenant_id' ELSE '' END,
      v_items_code_col
    );
  END IF;

  -- Re-enable triggers on grn_items
  BEGIN
    EXECUTE 'ALTER TABLE grn_items ENABLE TRIGGER ALL';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not enable triggers on grn_items: %', SQLERRM;
  END;

  -- Update any existing stock entries for this GRN
  EXECUTE format($SQL$
    WITH g AS (
      SELECT id, tenant_id, warehouse_id, grn_number, created_at
      FROM grns
      WHERE grn_number = %L
      LIMIT 1
    ), gi AS (
      SELECT
        grn_items.id AS grn_item_id,
        COALESCE(
          grn_items.item_id,
          %s
          %s
        ) AS resolved_item_id,
        %s
        COALESCE(grn_items.%I, 0)::numeric AS expected_qty,
        COALESCE(%s, 0)::numeric AS expected_unit_price
      FROM grn_items
      JOIN g ON g.id = grn_items.grn_id
      %s
      %s
    )
    UPDATE stock_entries se
    SET
      quantity = gi.expected_qty,
      available_quantity = gi.expected_qty,
      unit_price = gi.expected_unit_price,
      updated_at = NOW(),
      metadata = COALESCE(se.metadata, '{}'::jsonb)
        || jsonb_build_object(
          'fix_reason', 'Corrected to GRN accepted qty',
          'fixed_at', NOW()::text,
          'grn_item_id', gi.grn_item_id
        )
    FROM g, gi
    WHERE se.tenant_id = g.tenant_id
      AND se.warehouse_id = g.warehouse_id
      AND se.item_id = gi.resolved_item_id
      AND se.metadata->>'grn_reference' = g.grn_number;
  $SQL$,
    v_grn_number,
    CASE
      WHEN v_has_po_item_id AND v_po_table_name IS NOT NULL THEN format('(SELECT poi.item_id FROM %I poi WHERE poi.id = grn_items.%I)', v_po_table_name, v_po_item_id_col) || ','
      ELSE 'NULL,'
    END,
    CASE
      WHEN v_has_item_code THEN format(
        '(SELECT it.id FROM items it WHERE %s upper(trim(it.%I)) = upper(trim(grn_items.item_code)) LIMIT 1)',
        CASE WHEN v_items_has_tenant THEN 'it.tenant_id = g.tenant_id AND' ELSE '' END,
        v_items_code_col
      )
      ELSE 'NULL'
    END,
    CASE WHEN v_has_batch THEN 'grn_items.batch_number,' ELSE '' END,
    v_accepted_col,
    CASE WHEN v_unit_price_col IN ('unit_price', 'rate') THEN 'grn_items.' || v_unit_price_col ELSE v_unit_price_col END,
    CASE
      WHEN v_has_po_item_id AND v_po_table_name IS NOT NULL THEN format('LEFT JOIN %I poi ON poi.id = grn_items.%I', v_po_table_name, v_po_item_id_col)
      ELSE ''
    END,
    CASE
      WHEN v_has_item_code THEN format(
        'LEFT JOIN items it ON %s upper(trim(it.%I)) = upper(trim(grn_items.item_code))',
        CASE WHEN v_items_has_tenant THEN 'it.tenant_id = g.tenant_id AND' ELSE '' END,
        v_items_code_col
      )
      ELSE ''
    END
  );

  -- Insert missing stock entries for this GRN
  EXECUTE format($SQL$
    WITH g AS (
      SELECT id, tenant_id, warehouse_id, grn_number, created_at
      FROM grns
      WHERE grn_number = %L
      LIMIT 1
    ), gi AS (
      SELECT
        grn_items.id AS grn_item_id,
        COALESCE(
          grn_items.item_id,
          %s
          %s
        ) AS resolved_item_id,
        %s
        COALESCE(grn_items.%I, 0)::numeric AS expected_qty,
        COALESCE(%s, 0)::numeric AS expected_unit_price
      FROM grn_items
      JOIN g ON g.id = grn_items.grn_id
      %s
      %s
    )
    INSERT INTO stock_entries (
      tenant_id,
      item_id,
      warehouse_id,
      quantity,
      available_quantity,
      allocated_quantity,
      unit_price,
      batch_number,
      metadata,
      created_at,
      updated_at
    )
    SELECT
      g.tenant_id,
      gi.resolved_item_id,
      g.warehouse_id,
      gi.expected_qty,
      gi.expected_qty,
      0,
      gi.expected_unit_price,
      %s
      jsonb_build_object(
        'grn_reference', g.grn_number,
        'created_from', 'GRN_QC_ACCEPT_BACKFILL',
        'fix_inserted', true,
        'fixed_at', NOW()::text,
        'grn_item_id', gi.grn_item_id
      ),
      g.created_at,
      NOW()
    FROM g, gi
    WHERE gi.expected_qty > 0
      AND gi.resolved_item_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM stock_entries se
        WHERE se.tenant_id = g.tenant_id
          AND se.warehouse_id = g.warehouse_id
          AND se.item_id = gi.resolved_item_id
          AND se.metadata->>'grn_reference' = g.grn_number
      );
  $SQL$,
    v_grn_number,
    CASE
      WHEN v_has_po_item_id AND v_po_table_name IS NOT NULL THEN format('(SELECT poi.item_id FROM %I poi WHERE poi.id = grn_items.%I)', v_po_table_name, v_po_item_id_col) || ','
      ELSE 'NULL,'
    END,
    CASE
      WHEN v_has_item_code THEN format(
        '(SELECT it.id FROM items it WHERE %s upper(trim(it.%I)) = upper(trim(grn_items.item_code)) LIMIT 1)',
        CASE WHEN v_items_has_tenant THEN 'it.tenant_id = g.tenant_id AND' ELSE '' END,
        v_items_code_col
      )
      ELSE 'NULL'
    END,
    CASE WHEN v_has_batch THEN 'grn_items.batch_number,' ELSE '' END,
    v_accepted_col,
    CASE WHEN v_unit_price_col IN ('unit_price', 'rate') THEN 'grn_items.' || v_unit_price_col ELSE v_unit_price_col END,
    CASE
      WHEN v_has_po_item_id AND v_po_table_name IS NOT NULL THEN format('LEFT JOIN %I poi ON poi.id = grn_items.%I', v_po_table_name, v_po_item_id_col)
      ELSE ''
    END,
    CASE
      WHEN v_has_item_code THEN format(
        'LEFT JOIN items it ON %s upper(trim(it.%I)) = upper(trim(grn_items.item_code))',
        CASE WHEN v_items_has_tenant THEN 'it.tenant_id = g.tenant_id AND' ELSE '' END,
        v_items_code_col
      )
      ELSE ''
    END,
    CASE WHEN v_has_batch THEN 'gi.batch_number,' ELSE 'NULL,' END
  );
END $$;
