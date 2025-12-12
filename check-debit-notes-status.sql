-- Check if debit notes exist
SELECT 
  dn.id,
  dn.debit_note_number,
  dn.grn_id,
  dn.vendor_id,
  dn.total_amount,
  dn.status,
  dn.created_at,
  g.grn_number
FROM debit_notes dn
LEFT JOIN grns g ON g.id = dn.grn_id
ORDER BY dn.created_at DESC;

-- Check debit note items
SELECT 
  dni.id,
  dni.debit_note_id,
  dni.item_id,
  dni.rejected_qty,
  dni.unit_price,
  dni.amount,
  dni.rejection_reason
FROM debit_note_items dni
ORDER BY dni.created_at DESC;

-- Check GRN-2025-12-017 specifically
SELECT 
  gi.id,
  gi.grn_id,
  gi.item_id,
  gi.rejected_qty,
  gi.rate,
  gi.rejection_amount,
  gi.return_status,
  gi.rejection_reason
FROM grn_items gi
WHERE gi.grn_id = 'e3b08ff3-2ed1-484c-a66e-f086a8528292'
  AND gi.rejected_qty > 0;
