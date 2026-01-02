-- Backfill stock entries for existing GRNs that have accepted items but no stock entries
-- This handles GRNs created before the item_id fix

-- Step 1: Find GRN items that should have stock entries but don't
WITH grn_items_needing_stock AS (
  SELECT 
    gi.id as grn_item_id,
    g.tenant_id,
    gi.item_id,
    g.warehouse_id,
    gi.accepted_qty as quantity,
    gi.accepted_qty as available_quantity,
    0 as allocated_quantity,
    gi.rate as unit_price,
    gi.batch_number,
    g.grn_number,
    g.created_at
  FROM grn_items gi
  JOIN grns g ON g.id = gi.grn_id
  WHERE gi.item_id IS NOT NULL
    AND gi.accepted_qty > 0
    AND g.warehouse_id IS NOT NULL
    -- Only process items that don't already have a stock entry
    AND NOT EXISTS (
      SELECT 1 FROM stock_entries se 
      WHERE se.item_id = gi.item_id 
        AND se.warehouse_id = g.warehouse_id
        AND se.metadata->>'grn_reference' = g.grn_number
    )
)
-- Step 2: Insert stock entries for these items
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
  tenant_id,
  item_id,
  warehouse_id,
  quantity,
  available_quantity,
  allocated_quantity,
  unit_price,
  batch_number,
  jsonb_build_object(
    'grn_reference', grn_number,
    'created_from', 'BACKFILL_EXISTING_GRNS',
    'backfill_date', NOW()
  ) as metadata,
  created_at,
  NOW() as updated_at
FROM grn_items_needing_stock;

-- Step 3: Show what was created
SELECT 
  se.id,
  i.code as item_code,
  w.name as warehouse_name,
  se.quantity,
  se.available_quantity,
  se.metadata->>'grn_reference' as grn_number,
  se.metadata->>'created_from' as source,
  se.created_at
FROM stock_entries se
JOIN items i ON i.id = se.item_id
JOIN warehouses w ON w.id = se.warehouse_id
WHERE se.metadata->>'created_from' = 'BACKFILL_EXISTING_GRNS'
ORDER BY se.created_at DESC;
