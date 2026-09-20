-- Add GST calculation to Debit Notes
-- This ensures debit notes properly reflect GST on rejected materials

DO $$
BEGIN
  RAISE NOTICE '=== Adding GST columns to debit_notes and debit_note_items ===';
  
  -- Add GST columns to debit_notes table
  ALTER TABLE debit_notes
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5,2) DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0;
  
  -- Rename total_amount to total_amount_with_gst for clarity (or keep total_amount as the final value)
  -- We'll keep total_amount as the final amount (gross + tax)
  
  RAISE NOTICE 'OK - GST columns added to debit_notes';
  
  -- Add GST columns to debit_note_items table  
  ALTER TABLE debit_note_items
  ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5,2) DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0;
  
  RAISE NOTICE 'OK - GST columns added to debit_note_items';
  
  -- For existing debit notes, backfill the values
  -- Assume total_amount was the gross amount (without GST)
  UPDATE debit_notes
  SET 
    gross_amount = total_amount,
    tax_amount = ROUND(total_amount * (gst_percentage / 100), 2),
    total_amount = ROUND(total_amount * (1 + gst_percentage / 100), 2)
  WHERE gross_amount = 0 OR gross_amount IS NULL;
  
  RAISE NOTICE 'OK - Backfilled existing debit notes with GST';
  
  -- For existing debit note items, backfill
  UPDATE debit_note_items
  SET 
    tax_amount = ROUND(amount * (gst_percentage / 100), 2)
  WHERE tax_amount = 0 OR tax_amount IS NULL;
  
  RAISE NOTICE 'OK - Backfilled existing debit note items with GST';
  
  RAISE NOTICE '=== GST columns added successfully ===';
  RAISE NOTICE 'Structure:';
  RAISE NOTICE 'debit_notes.gross_amount: Base amount before GST';
  RAISE NOTICE 'debit_notes.gst_percentage: GST rate (default 18 percent)';
  RAISE NOTICE 'debit_notes.tax_amount: Calculated GST amount';
  RAISE NOTICE 'debit_notes.total_amount: Final amount (gross + tax)';
END $$;

-- Update the trigger to include GST in calculations
CREATE OR REPLACE FUNCTION update_grn_payable_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_grn_gross_amount NUMERIC(15,2);
  v_grn_gst_percentage NUMERIC(5,2);
  v_grn_tax_amount NUMERIC(15,2);
  v_total_debit_with_gst NUMERIC(15,2);
BEGIN
  -- Get GRN's GST details
  SELECT gross_amount, gst_percentage, tax_amount
  INTO v_grn_gross_amount, v_grn_gst_percentage, v_grn_tax_amount
  FROM grns
  WHERE id = NEW.grn_id;
  
  -- Calculate total debit note amount (including GST)
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_debit_with_gst
  FROM debit_notes
  WHERE grn_id = NEW.grn_id
  AND status IN ('APPROVED', 'SENT', 'ACKNOWLEDGED', 'CLOSED');
  
  -- Update GRN with debit note amount (with GST) and recalculate net payable
  -- Formula: net_payable = (gross + tax) - debit_note_amount_with_gst
  UPDATE grns
  SET 
    debit_note_amount = v_total_debit_with_gst,
    net_payable_amount = COALESCE(v_grn_gross_amount, 0) + COALESCE(v_grn_tax_amount, 0) - v_total_debit_with_gst,
    updated_at = NOW()
  WHERE id = NEW.grn_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_grn_payable ON debit_notes;
CREATE TRIGGER trigger_update_grn_payable
AFTER INSERT OR UPDATE OF total_amount, gross_amount, tax_amount, status ON debit_notes
FOR EACH ROW
EXECUTE FUNCTION update_grn_payable_amount();

-- Show sample debit notes with GST breakdown
SELECT 
  debit_note_number,
  debit_note_date,
  gross_amount as "Gross Amount",
  gst_percentage as "GST %",
  tax_amount as "Tax Amount",
  total_amount as "Total (with GST)",
  status
FROM debit_notes
ORDER BY created_at DESC
LIMIT 10;
