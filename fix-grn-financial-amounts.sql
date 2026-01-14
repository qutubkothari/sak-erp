-- Now update GRN financial amounts using correct column names
DO $$
DECLARE
  v_tenant_id UUID := 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
  v_updated_count int;
BEGIN
  RAISE NOTICE '=== Updating GRN Financial Amounts ===';
  
  -- Update gross_amount from grn_items (use amount column or calculate from rate * received_qty)
  UPDATE grns g
  SET gross_amount = COALESCE((
    SELECT SUM(COALESCE(gi.amount, gi.rate * gi.received_qty))
    FROM grn_items gi
    WHERE gi.grn_id = g.id
  ), 0)
  WHERE g.tenant_id = v_tenant_id
    AND g.status = 'COMPLETED';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated gross_amount for % GRNs', v_updated_count;
  
  -- Update debit_note_amount from approved debit notes
  UPDATE grns g
  SET debit_note_amount = COALESCE((
    SELECT SUM(dn.total_amount)
    FROM debit_notes dn
    WHERE dn.grn_id = g.id
      AND dn.status IN ('APPROVED', 'SENT', 'ACKNOWLEDGED', 'CLOSED')
  ), 0)
  WHERE g.tenant_id = v_tenant_id
    AND g.status = 'COMPLETED';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated debit_note_amount for % GRNs', v_updated_count;
  
  -- Calculate net_payable_amount (gross - debit)
  UPDATE grns
  SET net_payable_amount = COALESCE(gross_amount, 0) - COALESCE(debit_note_amount, 0)
  WHERE tenant_id = v_tenant_id
    AND status = 'COMPLETED';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated net_payable_amount for % GRNs', v_updated_count;
  
  RAISE NOTICE 'Update complete!';
END $$;

-- Verify the final results
SELECT 'Final GRN Financial Summary' as summary;
SELECT 
  grn_number,
  status,
  gross_amount,
  debit_note_amount,
  net_payable_amount,
  (SELECT COUNT(*) FROM grn_items WHERE grn_id = grns.id) as item_count
FROM grns
WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
  AND status = 'COMPLETED'
ORDER BY created_at DESC;
