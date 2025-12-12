-- Fix GRN-2025-12-017 rejection_amount
-- Update rejection_amount = rejected_qty * rate

UPDATE grn_items
SET 
  rejection_amount = rejected_qty * rate,
  return_status = 'PENDING_RETURN'
WHERE grn_id = 'e3b08ff3-2ed1-484c-a66e-f086a8528292'
  AND rejected_qty > 0
  AND (rejection_amount = 0 OR rejection_amount IS NULL);

-- Verify the update
SELECT 
  id,
  item_id,
  rejected_qty,
  rate,
  rejection_amount,
  return_status,
  rejection_reason
FROM grn_items
WHERE grn_id = 'e3b08ff3-2ed1-484c-a66e-f086a8528292'
  AND rejected_qty > 0;

-- Check if debit notes exist
SELECT 
  debit_note_number,
  total_amount,
  status,
  created_at
FROM debit_notes
WHERE grn_id = 'e3b08ff3-2ed1-484c-a66e-f086a8528292';
