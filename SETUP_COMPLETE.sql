-- ========================================
-- COMPLETE DEBIT NOTE SYSTEM SETUP
-- Run this once to finalize everything
-- ========================================

-- Step 0: Create Financial Columns
-- ========================================
DO $$
BEGIN
  RAISE NOTICE 'Step 0: Creating financial columns if they do not exist...';
  
  -- Add financial tracking columns to grns table
  ALTER TABLE grns
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debit_note_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_payable_amount NUMERIC(15,2) DEFAULT 0;
  
  RAISE NOTICE '  ✓ Financial columns created';
END $$;

-- Step 1: Populate GRN Financial Amounts
-- ========================================
DO $$
BEGIN
  RAISE NOTICE 'Step 1: Populating GRN financial amounts...';
  
  -- Update gross_amount from grn_items
  UPDATE grns g
  SET gross_amount = (
    SELECT COALESCE(SUM(gi.rate * gi.received_qty), 0)
    FROM grn_items gi
    WHERE gi.grn_id = g.id
  )
  WHERE g.status = 'COMPLETED';
  
  RAISE NOTICE '  ✓ Updated gross_amount for COMPLETED GRNs';
  
  -- Update debit_note_amount from approved debit notes
  UPDATE grns g
  SET debit_note_amount = (
    SELECT COALESCE(SUM(dn.total_amount), 0)
    FROM debit_notes dn
    WHERE dn.grn_id = g.id
    AND dn.status IN ('APPROVED', 'SENT', 'ACKNOWLEDGED', 'CLOSED')
  )
  WHERE g.status = 'COMPLETED';
  
  RAISE NOTICE '  ✓ Updated debit_note_amount from approved debit notes';
  
  -- Calculate net_payable_amount (gross - debit)
  UPDATE grns
  SET net_payable_amount = COALESCE(gross_amount, 0) - COALESCE(debit_note_amount, 0)
  WHERE status = 'COMPLETED';
  
  RAISE NOTICE '  ✓ Calculated net_payable_amount';
END $$;

-- Step 2: Fix any missing rejection amounts
-- ========================================
DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  RAISE NOTICE 'Step 2: Fixing missing rejection amounts...';
  
  UPDATE grn_items
  SET rejection_amount = rejected_qty * rate,
      return_status = 'PENDING_RETURN'
  WHERE rejected_qty > 0
    AND (rejection_amount IS NULL OR rejection_amount = 0)
    AND rate > 0;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ✓ Fixed % grn_items with missing rejection_amount', rows_updated;
END $$;

-- Step 3: Ensure all debit notes have proper status
-- ========================================
DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  RAISE NOTICE 'Step 3: Checking debit note statuses...';
  
  UPDATE debit_notes
  SET status = 'DRAFT'
  WHERE status IS NULL;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  IF rows_updated > 0 THEN
    RAISE NOTICE '  ✓ Fixed % debit notes with null status', rows_updated;
  ELSE
    RAISE NOTICE '  ✓ All debit notes have valid statuses';
  END IF;
END $$;

-- Step 4: Verification - Show Summary
-- ========================================
DO $$
DECLARE
  total_grns INTEGER;
  grns_with_financials INTEGER;
  total_debit_notes INTEGER;
  approved_debit_notes INTEGER;
  total_payable NUMERIC;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SYSTEM VERIFICATION SUMMARY';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO total_grns
  FROM grns
  WHERE status = 'COMPLETED';
  
  SELECT COUNT(*) INTO grns_with_financials
  FROM grns
  WHERE status = 'COMPLETED'
    AND gross_amount > 0;
  
  SELECT COUNT(*) INTO total_debit_notes
  FROM debit_notes;
  
  SELECT COUNT(*) INTO approved_debit_notes
  FROM debit_notes
  WHERE status IN ('APPROVED', 'SENT', 'ACKNOWLEDGED', 'CLOSED');
  
  SELECT COALESCE(SUM(net_payable_amount), 0) INTO total_payable
  FROM grns
  WHERE status = 'COMPLETED';
  
  RAISE NOTICE 'Completed GRNs: %', total_grns;
  RAISE NOTICE 'GRNs with Financial Data: % (%.0f%%)', 
    grns_with_financials, 
    CASE WHEN total_grns > 0 THEN (grns_with_financials::NUMERIC / total_grns * 100) ELSE 0 END;
  RAISE NOTICE '';
  RAISE NOTICE 'Total Debit Notes: %', total_debit_notes;
  RAISE NOTICE 'Approved Debit Notes: %', approved_debit_notes;
  RAISE NOTICE '';
  RAISE NOTICE 'Total Outstanding Payable: ₹%', total_payable;
  RAISE NOTICE '========================================';
END $$;

-- Final Verification Queries
-- ========================================

-- Show recent GRNs with financial data
SELECT 
  'Recent GRNs' as report_type,
  g.grn_number,
  g.status,
  v.name as vendor_name,
  g.gross_amount,
  g.debit_note_amount,
  g.net_payable_amount
FROM grns g
LEFT JOIN vendors v ON g.vendor_id = v.id
WHERE g.status = 'COMPLETED'
ORDER BY g.created_at DESC
LIMIT 5;

-- Show recent debit notes
SELECT 
  'Recent Debit Notes' as report_type,
  dn.debit_note_number,
  dn.status,
  dn.total_amount,
  g.grn_number,
  v.name as vendor_name,
  dn.created_at
FROM debit_notes dn
LEFT JOIN grns g ON dn.grn_id = g.id
LEFT JOIN vendors v ON dn.vendor_id = v.id
ORDER BY dn.created_at DESC
LIMIT 5;

-- Show vendor-wise payables summary
SELECT 
  'Vendor Payables Summary' as report_type,
  v.name as vendor_name,
  COUNT(g.id) as grn_count,
  COALESCE(SUM(g.gross_amount), 0) as total_gross,
  COALESCE(SUM(g.debit_note_amount), 0) as total_debit,
  COALESCE(SUM(g.net_payable_amount), 0) as total_payable
FROM vendors v
LEFT JOIN grns g ON v.id = g.vendor_id AND g.status = 'COMPLETED'
WHERE g.id IS NOT NULL
GROUP BY v.id, v.name
HAVING SUM(g.net_payable_amount) > 0
ORDER BY total_payable DESC;

-- ========================================
-- SETUP COMPLETE!
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ DEBIT NOTE SYSTEM SETUP COMPLETE  ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Refresh Purchase → Debit Notes page';
  RAISE NOTICE '2. Check Accounts → Payables dashboard';
  RAISE NOTICE '3. Test QC Accept with rejections';
  RAISE NOTICE '4. Review DEBIT_NOTE_COMPLETE_GUIDE.md';
  RAISE NOTICE '';
END $$;
