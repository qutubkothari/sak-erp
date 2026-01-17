-- Verify Debit Note GST Implementation
-- Run these queries to verify GST is being calculated correctly

-- 1. Check debit_notes table structure (should have GST columns)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'debit_notes'
AND column_name IN ('gross_amount', 'gst_percentage', 'tax_amount', 'total_amount')
ORDER BY ordinal_position;

-- 2. Check debit_note_items table structure (should have GST columns)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'debit_note_items'
AND column_name IN ('amount', 'gst_percentage', 'tax_amount')
ORDER BY ordinal_position;

-- 3. View all debit notes with GST breakdown
SELECT 
  debit_note_number,
  debit_note_date,
  status,
  gross_amount as "Gross (Before Tax)",
  gst_percentage as "GST %",
  tax_amount as "Tax Amount",
  total_amount as "Total (with GST)",
  (gross_amount + tax_amount) as "Calculated Total",
  CASE 
    WHEN ABS(total_amount - (gross_amount + tax_amount)) < 0.01 THEN '✓ Match'
    ELSE '✗ Mismatch'
  END as "Validation"
FROM debit_notes
ORDER BY created_at DESC
LIMIT 20;

-- 4. View debit note items with GST breakdown
SELECT 
  dn.debit_note_number,
  dni.item_id,
  dni.rejected_qty,
  dni.unit_price,
  dni.amount as "Item Amount",
  dni.gst_percentage as "GST %",
  dni.tax_amount as "Tax",
  (dni.amount + dni.tax_amount) as "Item Total",
  dni.rejection_reason
FROM debit_note_items dni
JOIN debit_notes dn ON dni.debit_note_id = dn.id
ORDER BY dn.created_at DESC, dni.created_at
LIMIT 20;

-- 5. Verify GRN net payable calculation with debit notes
SELECT 
  g.grn_number,
  g.status,
  g.gross_amount as "GRN Gross",
  g.tax_amount as "GRN Tax",
  (g.gross_amount + g.tax_amount) as "GRN Total with Tax",
  g.debit_note_amount as "Total Debit Notes (with GST)",
  g.net_payable_amount as "Net Payable",
  ((g.gross_amount + g.tax_amount) - g.debit_note_amount) as "Expected Net Payable",
  CASE 
    WHEN ABS(g.net_payable_amount - ((g.gross_amount + g.tax_amount) - g.debit_note_amount)) < 0.01 THEN '✓ Correct'
    ELSE '✗ Incorrect'
  END as "Validation"
FROM grns g
WHERE g.debit_note_amount > 0
ORDER BY g.created_at DESC
LIMIT 10;

-- 6. Summary: Total debit notes by status with GST
SELECT 
  status,
  COUNT(*) as "Count",
  SUM(gross_amount) as "Total Gross",
  SUM(tax_amount) as "Total Tax",
  SUM(total_amount) as "Total (with GST)",
  ROUND(AVG(gst_percentage), 2) as "Avg GST %"
FROM debit_notes
GROUP BY status
ORDER BY status;

-- 7. Find any debit notes with missing or zero GST (these need attention)
SELECT 
  debit_note_number,
  debit_note_date,
  status,
  gross_amount,
  gst_percentage,
  tax_amount,
  total_amount,
  CASE 
    WHEN gst_percentage IS NULL OR gst_percentage = 0 THEN 'Missing GST %'
    WHEN tax_amount IS NULL OR tax_amount = 0 THEN 'Missing Tax Amount'
    WHEN gross_amount IS NULL OR gross_amount = 0 THEN 'Missing Gross Amount'
    ELSE 'OK'
  END as "Issue"
FROM debit_notes
WHERE gst_percentage IS NULL OR gst_percentage = 0
   OR tax_amount IS NULL OR tax_amount = 0
   OR gross_amount IS NULL OR gross_amount = 0
ORDER BY created_at DESC;

-- 8. Latest debit note with full details
SELECT 
  dn.*,
  g.grn_number,
  v.name as vendor_name
FROM debit_notes dn
LEFT JOIN grns g ON dn.grn_id = g.id
LEFT JOIN vendors v ON dn.vendor_id = v.id
ORDER BY dn.created_at DESC
LIMIT 1;
