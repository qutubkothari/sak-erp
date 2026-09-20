-- Set RAW_MATERIAL items stock to 500 (for testing auto-assembly creation)
--
-- This script updates stock ONLY for RAW_MATERIAL items, NOT SUB_ASSEMBLY.
-- This allows testing if sub-assemblies are automatically created when needed.
--
-- IMPORTANT:
-- - Run only on test/staging database
-- - This will override current inventory values for raw materials
--

BEGIN;

-- Get the tenant ID (assumes single tenant or specify your tenant)
DO $$
DECLARE
  v_tenant_id UUID;
  v_warehouse_id UUID;
BEGIN
  -- Get first active tenant
  SELECT id INTO v_tenant_id FROM tenants WHERE is_active = true LIMIT 1;
  
  -- Get first active warehouse for this tenant
  SELECT id INTO v_warehouse_id 
  FROM warehouses 
  WHERE tenant_id = v_tenant_id AND is_active = true 
  ORDER BY created_at 
  LIMIT 1;

  RAISE NOTICE 'Using Tenant: %, Warehouse: %', v_tenant_id, v_warehouse_id;

  -- 1) Delete existing inventory_stock records for RAW_MATERIAL items
  DELETE FROM inventory_stock
  WHERE tenant_id = v_tenant_id
    AND item_id IN (
      SELECT id FROM items 
      WHERE tenant_id = v_tenant_id 
      AND type = 'RAW_MATERIAL'
    );

  -- 2) Insert new inventory_stock records with quantity = 500
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
    v_warehouse_id,
    NULL AS location_id,
    'RAW_MATERIAL'::inventory_category AS category,
    500::DECIMAL(12,2) AS quantity,
    0::DECIMAL(12,2) AS reserved_quantity,
    0::DECIMAL(12,2) AS min_quantity,
    NULL::DECIMAL(12,2) AS max_quantity,
    10::DECIMAL(12,2) AS reorder_point,
    NOW() AS last_movement_date,
    NOW() AS created_at,
    NOW() AS updated_at
  FROM items i
  WHERE i.tenant_id = v_tenant_id
    AND i.type = 'RAW_MATERIAL';

  -- 3) Delete existing stock_entries for RAW_MATERIAL items
  DELETE FROM stock_entries
  WHERE tenant_id = v_tenant_id
    AND item_id IN (
      SELECT id FROM items 
      WHERE tenant_id = v_tenant_id 
      AND type = 'RAW_MATERIAL'
    );

  -- 4) Insert new stock_entries records with quantity = 500
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
    v_warehouse_id,
    500::DECIMAL(12,2) AS quantity,
    500::DECIMAL(12,2) AS available_quantity,
    0::DECIMAL(12,2) AS allocated_quantity,
    NULL::DECIMAL(15,2) AS unit_price,
    'INITIAL-STOCK'::VARCHAR(50) AS batch_number,
    NULL::DATE AS expiry_date,
    '{"source": "initial_stock_setup"}'::JSONB AS metadata,
    NOW() AS created_at,
    NOW() AS updated_at
  FROM items i
  WHERE i.tenant_id = v_tenant_id
    AND i.type = 'RAW_MATERIAL';

  -- Show summary
  RAISE NOTICE 'Updated % RAW_MATERIAL items in inventory_stock', 
    (SELECT COUNT(*) FROM items WHERE tenant_id = v_tenant_id AND type = 'RAW_MATERIAL');
  RAISE NOTICE 'Updated % RAW_MATERIAL items in stock_entries', 
    (SELECT COUNT(*) FROM items WHERE tenant_id = v_tenant_id AND type = 'RAW_MATERIAL');
  RAISE NOTICE 'SUB_ASSEMBLY items (%) were NOT updated - check if they auto-create', 
    (SELECT COUNT(*) FROM items WHERE tenant_id = v_tenant_id AND type = 'SUB_ASSEMBLY');

END $$;

COMMIT;

-- Verification queries:
SELECT 
  'RAW_MATERIAL stock' AS category,
  COUNT(*) AS item_count, 
  SUM(quantity) AS total_quantity 
FROM inventory_stock ist
JOIN items i ON i.id = ist.item_id
WHERE i.type = 'RAW_MATERIAL';

SELECT 
  'SUB_ASSEMBLY stock' AS category,
  COUNT(*) AS item_count, 
  SUM(quantity) AS total_quantity 
FROM inventory_stock ist
JOIN items i ON i.id = ist.item_id
WHERE i.type = 'SUB_ASSEMBLY';

SELECT 
  i.type,
  COUNT(*) AS item_count,
  COUNT(ist.id) AS items_with_stock
FROM items i
LEFT JOIN inventory_stock ist ON ist.item_id = i.id
GROUP BY i.type
ORDER BY i.type;
