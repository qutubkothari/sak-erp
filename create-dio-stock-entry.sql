-- Create stock entry for DIO-SMD-PNJM7 using item_id from UIDs
-- GRN-2025-12-003 has 5 UIDs, so quantity should be 5

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
VALUES (
  (SELECT tenant_id FROM grns WHERE id = '9196e1fa-3727-4411-9f5d-9086452814dd'), -- Get tenant_id from GRN
  'f3c83188-429d-4981-95ee-a97c9e8b0f84', -- DIO-SMD-PNJM7 item_id
  (SELECT warehouse_id FROM grns WHERE id = '9196e1fa-3727-4411-9f5d-9086452814dd'), -- Get warehouse from GRN
  5, -- quantity (5 UIDs were generated)
  5, -- available_quantity
  0, -- allocated_quantity
  0, -- unit_price
  NULL, -- batch_number
  jsonb_build_object(
    'grn_reference', 'GRN-2025-12-003',
    'created_from', 'GRN_RECEIPT',
    'manually_created', true,
    'reason', 'Missing stock entry - GRN items were deleted but UIDs exist'
  ),
  (SELECT created_at FROM grns WHERE id = '9196e1fa-3727-4411-9f5d-9086452814dd'),
  (SELECT created_at FROM grns WHERE id = '9196e1fa-3727-4411-9f5d-9086452814dd')
);

-- Verify the insertion
SELECT 
  'Stock Entry Created' as status,
  i.code,
  i.name,
  se.quantity,
  se.available_quantity,
  se.metadata->>'grn_reference' as grn_reference,
  se.created_at
FROM stock_entries se
JOIN items i ON se.item_id = i.id
WHERE se.item_id = 'f3c83188-429d-4981-95ee-a97c9e8b0f84'
ORDER BY se.created_at DESC;
