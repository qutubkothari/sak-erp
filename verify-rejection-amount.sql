-- Verify rejection_amount for GRN-2025-12-017
SELECT 
  gi.id,
  gi.item_id,
  gi.item_code,
  gi.rejected_qty,
  gi.rate,
  gi.rejection_amount,
  gi.return_status
FROM grn_items gi
WHERE gi.grn_id = 'e3b08ff3-2ed1-484c-a66e-f086a8528292'
  AND gi.rejected_qty > 0;
