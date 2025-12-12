-- Populate GRN financial amounts for Accounts Payable
-- This calculates gross_amount, debit_note_amount, and net_payable_amount

-- 1. Update gross_amount from grn_items
UPDATE grns g
SET gross_amount = (
  SELECT COALESCE(SUM(gi.rate * gi.received_qty), 0)
  FROM grn_items gi
  WHERE gi.grn_id = g.id
)
WHERE g.status = 'COMPLETED';

-- 2. Update debit_note_amount from approved debit notes
UPDATE grns g
SET debit_note_amount = (
  SELECT COALESCE(SUM(dn.total_amount), 0)
  FROM debit_notes dn
  WHERE dn.grn_id = g.id
  AND dn.status IN ('APPROVED', 'SENT', 'ACKNOWLEDGED', 'CLOSED')
)
WHERE g.status = 'COMPLETED';

-- 3. Calculate net_payable_amount (gross - debit)
UPDATE grns
SET net_payable_amount = COALESCE(gross_amount, 0) - COALESCE(debit_note_amount, 0)
WHERE status = 'COMPLETED';

-- 4. Verify the updates
SELECT 
  g.grn_number,
  g.status,
  v.name as vendor_name,
  g.gross_amount,
  g.debit_note_amount,
  g.net_payable_amount,
  g.paid_amount,
  g.payment_status
FROM grns g
LEFT JOIN vendors v ON g.vendor_id = v.id
WHERE g.status = 'COMPLETED'
ORDER BY g.created_at DESC
LIMIT 10;
