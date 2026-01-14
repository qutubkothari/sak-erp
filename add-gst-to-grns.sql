-- Add GST/Tax columns to GRNs table and update net_payable calculation
-- This ensures Net Payable amount includes GST

DO $$
BEGIN
  RAISE NOTICE '=== Adding GST columns to GRNs table ===';
  
  -- Add tax-related columns if they don't exist
  ALTER TABLE grns
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5,2) DEFAULT 18.00; -- Default 18% GST
  
  RAISE NOTICE '✓ Tax columns added';
  
  -- Update tax_amount based on gross_amount and GST percentage
  UPDATE grns
  SET tax_amount = ROUND(gross_amount * (gst_percentage / 100), 2)
  WHERE status = 'COMPLETED'
    AND gross_amount > 0;
  
  RAISE NOTICE '✓ Calculated tax amounts';
  
  -- Recalculate net_payable_amount to INCLUDE GST
  -- Formula: net_payable = (gross_amount + tax_amount) - debit_note_amount
  UPDATE grns
  SET net_payable_amount = COALESCE(gross_amount, 0) + COALESCE(tax_amount, 0) - COALESCE(debit_note_amount, 0)
  WHERE status = 'COMPLETED';
  
  RAISE NOTICE '✓ Updated net_payable_amount to include GST';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== Summary ===';
END $$;

-- Show updated amounts
SELECT 
  grn_number,
  gross_amount as "Gross (Before Tax)",
  gst_percentage as "GST %",
  tax_amount as "Tax Amount",
  (gross_amount + tax_amount) as "Total with GST",
  debit_note_amount as "Debit Notes",
  net_payable_amount as "Net Payable (with GST)"
FROM grns
WHERE status = 'COMPLETED'
  AND tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
ORDER BY created_at DESC;
