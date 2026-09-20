-- Check what GRN exists for DIO-SMD-PNJM7
SELECT 
  g.grn_number,
  g.status,
  i.code,
  gi.accepted_qty,
  g.created_at
FROM grns g
JOIN grn_items gi ON g.id = gi.grn_id
JOIN items i ON gi.item_id = i.id
WHERE i.code = 'DIO-SMD-PNJM7'
ORDER BY g.created_at DESC;
