-- Set ALL stock quantities to 50 (TESTING ONLY)
--
-- NOTE: The Items Master list (GET /inventory/items) computes `total_stock`
-- from `stock_entries.available_quantity` (see ItemsService.findAll).
-- If `stock_entries` has no rows, Items page will show 0 even if
-- `inventory_stock` was updated.
--
-- IMPORTANT:
-- - This will override real inventory values.
-- - Run only on a test/staging database.
-- - This script RESETS stock so that each item shows exactly 50.
-- - `inventory_stock.available_quantity` is a GENERATED column, so we update
--   `quantity` and `reserved_quantity` instead.
--
-- Optional safety: uncomment and set a tenant filter in both UPDATEs.
--   AND tenant_id = '00000000-0000-0000-0000-000000000000'

BEGIN;

-- Optional one-time backups (can be large). Comment out if you don't want backups.
CREATE TABLE IF NOT EXISTS inventory_stock_backup_2026_01_10 AS
SELECT * FROM inventory_stock;

CREATE TABLE IF NOT EXISTS stock_entries_backup_2026_01_10 AS
SELECT * FROM stock_entries;

-- Choose a default warehouse per tenant (first active warehouse)
-- NOTE: A CTE (WITH ...) only applies to ONE statement in Postgres.
-- We use a TEMP table so multiple statements can reuse it.
DROP TABLE IF EXISTS default_wh_temp;
CREATE TEMP TABLE default_wh_temp AS
SELECT DISTINCT ON (tenant_id)
  tenant_id,
  id AS warehouse_id
FROM warehouses
WHERE is_active = true
ORDER BY tenant_id, created_at NULLS LAST, id;

-- 1) Reset current-stock table
DELETE FROM inventory_stock;
-- WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

INSERT INTO inventory_stock (
  tenant_id,
  item_id,
  warehouse_id,
  location_id,
  category,
  quantity,
  reserved_quantity,
  min_quantity,
  max_quantity,
  reorder_point,
  last_movement_date,
  created_at,
  updated_at
)
SELECT
  i.tenant_id,
  i.id AS item_id,
  w.warehouse_id,
  NULL AS location_id,
  'RAW_MATERIAL'::inventory_category AS category,
  50::DECIMAL(12,2) AS quantity,
  0::DECIMAL(12,2) AS reserved_quantity,
  0::DECIMAL(12,2) AS min_quantity,
  NULL::DECIMAL(12,2) AS max_quantity,
  NULL::DECIMAL(12,2) AS reorder_point,
  NOW() AS last_movement_date,
  NOW() AS created_at,
  NOW() AS updated_at
FROM items i
JOIN default_wh_temp w ON w.tenant_id = i.tenant_id;

-- 2) Reset legacy/parallel table used by Items page
DELETE FROM stock_entries;
-- WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

INSERT INTO stock_entries (
  tenant_id,
  item_id,
  warehouse_id,
  quantity,
  available_quantity,
  allocated_quantity,
  unit_price,
  batch_number,
  expiry_date,
  metadata,
  created_at,
  updated_at
)
SELECT
  i.tenant_id,
  i.id AS item_id,
  w.warehouse_id,
  50::DECIMAL(12,2) AS quantity,
  50::DECIMAL(12,2) AS available_quantity,
  0::DECIMAL(12,2) AS allocated_quantity,
  NULL::DECIMAL(15,2) AS unit_price,
  NULL::VARCHAR(50) AS batch_number,
  NULL::DATE AS expiry_date,
  '{}'::JSONB AS metadata,
  NOW() AS created_at,
  NOW() AS updated_at
FROM items i
JOIN default_wh_temp w ON w.tenant_id = i.tenant_id;

COMMIT;

-- Quick sanity checks:
-- SELECT COUNT(*) AS inventory_stock_rows, SUM(quantity) AS inventory_stock_total_qty FROM inventory_stock;
-- SELECT COUNT(*) AS stock_entries_rows, SUM(available_quantity) AS stock_entries_total_avail FROM stock_entries;

-- If Items page still shows 0 after this, it usually means:
-- - You have no active warehouses (default_wh empty), or
-- - The API is pointing to a different database/tenant than where you ran this SQL.
