-- Check if debit note was created
SELECT 
  dn.id,
  dn.debit_note_number,
  dn.grn_id,
  dn.total_amount,
  dn.status,
  dn.created_at,
  g.grn_number
FROM debit_notes dn
LEFT JOIN grns g ON g.id = dn.grn_id
ORDER BY dn.created_at DESC
LIMIT 5;

-- Check debit note items
SELECT 
  dni.id,
  dni.debit_note_id,
  dni.item_id,
  dni.rejected_qty,
  dni.unit_price,
  dni.amount
FROM debit_note_items dni
ORDER BY dni.created_at DESC
LIMIT 5;

-- Check GRN qc_completed status
SELECT 
  g.id,
  g.grn_number,
  g.qc_completed,
  g.status
FROM grns g
WHERE g.id = 'e3b08ff3-2ed1-484c-a66e-f086a8528292';
