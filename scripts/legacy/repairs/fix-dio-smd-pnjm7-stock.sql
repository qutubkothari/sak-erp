-- Create missing stock entry for DIO-SMD-PNJM7 from GRN-2025-12-003

-- First, get the item_id and warehouse_id
WITH item_info AS (
  SELECT 
    i.id as item_id,
    i.code,
    gi.accepted_qty,
    g.grn_number,
    g.warehouse_id,
    g.created_at as grn_date
  FROM grns g
  JOIN grn_items gi ON g.id = gi.grn_id
  JOIN items i ON gi.item_id = i.id
  WHERE i.code = 'DIO-SMD-PNJM7'
    AND g.grn_number = 'GRN-2025-12-003'
)
INSERT INTO stock_entries (
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
  item_id,
  warehouse_id,
  accepted_qty,
  accepted_qty, -- available_quantity (all available since just received)
  0, -- allocated_quantity
  0, -- unit_price (will be updated later if needed)
  NULL, -- batch_number
  jsonb_build_object(
    'grn_reference', grn_number,
    'created_from', 'GRN_RECEIPT',
    'manually_created', true,
    'reason', 'Missing stock entry from GRN completion'
  ),
  grn_date,
  grn_date
FROM item_info;

-- Verify the insertion
SELECT 
  'Verification' as source,
  i.code,
  se.quantity,
  se.available_quantity,
  se.metadata->>'grn_reference' as grn_reference,
  se.created_at
FROM stock_entries se
JOIN items i ON se.item_id = i.id
WHERE i.code = 'DIO-SMD-PNJM7'
ORDER BY se.created_at DESC;
