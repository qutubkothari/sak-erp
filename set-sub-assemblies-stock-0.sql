-- Set ALL SUB_ASSEMBLY items stock to 0 (TESTING/RESET ONLY)
--
-- IMPORTANT:
-- - This overrides real inventory values.
-- - Run only on a test/staging database unless you are absolutely sure.
-- - The Items page typically computes stock from `stock_entries` totals.
-- - `inventory_stock.available_quantity` is a GENERATED column, so we update
--   `quantity` and `reserved_quantity` instead.
--
-- Optional safety: uncomment and set a tenant filter in both UPDATEs.
--   AND tenant_id = '00000000-0000-0000-0000-000000000000'

BEGIN;

-- 0) Preview (dry-run) what will be affected
SELECT
  i.tenant_id,
  COUNT(DISTINCT i.id) AS sub_assembly_items,
  COALESCE(SUM(ist.quantity), 0) AS inventory_stock_qty_sum
FROM items i
LEFT JOIN inventory_stock ist
  ON ist.tenant_id = i.tenant_id
 AND ist.item_id = i.id
WHERE i.type = 'SUB_ASSEMBLY'
GROUP BY i.tenant_id
ORDER BY i.tenant_id;

-- 1) Zero current-stock table rows (inventory_stock)
UPDATE inventory_stock ist
SET
  quantity = 0,
  reserved_quantity = 0,
  last_movement_date = NOW(),
  updated_at = NOW()
FROM items i
WHERE i.id = ist.item_id
  AND i.tenant_id = ist.tenant_id
  AND i.type = 'SUB_ASSEMBLY'
  -- AND ist.tenant_id = '00000000-0000-0000-0000-000000000000'
  ;

-- 2) Zero parallel/legacy table used by Items page (stock_entries)
-- NOTE: Some deployments use `available_qty` instead of `available_quantity`,
-- and some may not have `allocated_quantity` or `updated_at`.
DO $$
DECLARE
  se_available_col text;
  has_se_allocated boolean;
  has_se_updated_at boolean;
  sql_text text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='stock_entries'
      AND column_name='available_quantity'
  ) THEN
    se_available_col := 'available_quantity';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='stock_entries'
      AND column_name='available_qty'
  ) THEN
    se_available_col := 'available_qty';
  ELSE
    se_available_col := NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='stock_entries'
      AND column_name='allocated_quantity'
  ) INTO has_se_allocated;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='stock_entries'
      AND column_name='updated_at'
  ) INTO has_se_updated_at;

  sql_text := 'UPDATE stock_entries se SET quantity = 0';

  IF se_available_col IS NOT NULL THEN
    sql_text := sql_text || ', ' || quote_ident(se_available_col) || ' = 0';
  END IF;

  IF has_se_allocated THEN
    sql_text := sql_text || ', allocated_quantity = 0';
  END IF;

  IF has_se_updated_at THEN
    sql_text := sql_text || ', updated_at = NOW()';
  END IF;

  sql_text := sql_text ||
    ' FROM items i' ||
    ' WHERE i.id = se.item_id' ||
    ' AND i.tenant_id = se.tenant_id' ||
    ' AND i.type = ''SUB_ASSEMBLY''';
    -- ' AND se.tenant_id = ''00000000-0000-0000-0000-000000000000''';

  EXECUTE sql_text;
END $$;

COMMIT;

-- Quick sanity checks:
-- Inventory stock totals for SUB_ASSEMBLY should be 0
SELECT
  i.tenant_id,
  COUNT(*) AS inventory_stock_rows,
  COALESCE(SUM(ist.quantity), 0) AS total_quantity
FROM inventory_stock ist
JOIN items i
  ON i.id = ist.item_id
 AND i.tenant_id = ist.tenant_id
WHERE i.type = 'SUB_ASSEMBLY'
GROUP BY i.tenant_id
ORDER BY i.tenant_id;

-- Stock entries totals for SUB_ASSEMBLY should be 0 (works if `available_quantity` exists)
-- SELECT i.tenant_id, COUNT(*) AS stock_entries_rows, COALESCE(SUM(se.available_quantity),0) AS total_available
-- FROM stock_entries se
-- JOIN items i ON i.id = se.item_id AND i.tenant_id = se.tenant_id
-- WHERE i.type = 'SUB_ASSEMBLY'
-- GROUP BY i.tenant_id
-- ORDER BY i.tenant_id;
