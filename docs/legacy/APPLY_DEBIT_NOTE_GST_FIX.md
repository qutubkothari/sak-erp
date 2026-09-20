# Apply Debit Note GST Fix - Step by Step Guide

## Overview
This guide walks you through applying the GST calculation fix to debit notes.

## Prerequisites
- Database backup completed
- Access to Supabase SQL editor or database console
- API server access for restart

## Step 1: Backup Current Data (IMPORTANT!)

```sql
-- Create backup of debit_notes table
CREATE TABLE debit_notes_backup_20260117 AS 
SELECT * FROM debit_notes;

-- Create backup of debit_note_items table
CREATE TABLE debit_note_items_backup_20260117 AS 
SELECT * FROM debit_note_items;

-- Verify backups created
SELECT COUNT(*) FROM debit_notes_backup_20260117;
SELECT COUNT(*) FROM debit_note_items_backup_20260117;
```

## Step 2: Run the Migration

Execute the migration file in your database:

```bash
# If using Supabase SQL Editor:
# 1. Open Supabase Dashboard
# 2. Go to SQL Editor
# 3. Copy contents of add-gst-to-debit-notes.sql
# 4. Paste and execute
```

**File:** `add-gst-to-debit-notes.sql`

Expected output:
```
NOTICE:  === Adding GST columns to debit_notes and debit_note_items ===
NOTICE:  ✓ GST columns added to debit_notes
NOTICE:  ✓ GST columns added to debit_note_items
NOTICE:  ✓ Backfilled existing debit notes with GST
NOTICE:  ✓ Backfilled existing debit note items with GST
NOTICE:  === GST columns added successfully ===
```

## Step 3: Verify Database Changes

Run the verification queries:

```bash
# Execute verify-debit-note-gst.sql to check:
# - Table structure is correct
# - Existing data was migrated properly
# - Calculations are accurate
```

Key checks:
- ✅ debit_notes has: gross_amount, gst_percentage, tax_amount
- ✅ debit_note_items has: gst_percentage, tax_amount
- ✅ Trigger `update_grn_payable_amount` updated
- ✅ All existing debit notes have GST calculated

## Step 4: Restart API Service

The backend code changes are already deployed. Restart the API:

```bash
# For development:
pnpm -C apps/api run start:dev

# For production:
pm2 restart api
# or
systemctl restart sak-erp-api
```

## Step 5: Test the Fix

### Test 1: Create New Debit Note via QC Rejection

1. Create a new GRN
2. Perform QC with rejected items
3. Check debit note created automatically
4. Verify in database:
   ```sql
   SELECT * FROM debit_notes 
   ORDER BY created_at DESC LIMIT 1;
   ```
5. Expected: gross_amount, tax_amount, total_amount all populated

### Test 2: View Existing Debit Note

1. Open debit notes page
2. View any debit note details
3. Verify GST breakdown shows correctly

### Test 3: Send Debit Note Email

1. Open a debit note
2. Click "Send Email"
3. Check email shows:
   - Line items with GST
   - Subtotal
   - GST amount
   - Total (with GST)

### Test 4: Verify GRN Net Payable

1. View a GRN with debit notes
2. Check calculation:
   ```
   Net Payable = (GRN Gross + GRN Tax) - Debit Note Total (with GST)
   ```
3. Numbers should match

## Step 6: Verify Specific Scenarios

Run these SQL checks:

```sql
-- 1. Check a recent debit note
SELECT 
  debit_note_number,
  gross_amount,
  tax_amount,
  total_amount,
  (gross_amount + tax_amount) as calculated_total,
  CASE 
    WHEN ABS(total_amount - (gross_amount + tax_amount)) < 0.01 
    THEN '✓ PASS' 
    ELSE '✗ FAIL' 
  END as test_result
FROM debit_notes
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check GRN net payable after debit note
SELECT 
  g.grn_number,
  g.gross_amount + g.tax_amount as grn_total_with_tax,
  g.debit_note_amount,
  g.net_payable_amount,
  ((g.gross_amount + g.tax_amount) - g.debit_note_amount) as expected_net_payable,
  CASE 
    WHEN ABS(g.net_payable_amount - ((g.gross_amount + g.tax_amount) - g.debit_note_amount)) < 0.01 
    THEN '✓ PASS' 
    ELSE '✗ FAIL' 
  END as test_result
FROM grns g
WHERE g.debit_note_amount > 0
ORDER BY g.created_at DESC
LIMIT 5;
```

## Rollback Plan (If Needed)

If something goes wrong:

```sql
-- 1. Restore debit_notes table
DROP TABLE debit_notes;
ALTER TABLE debit_notes_backup_20260117 RENAME TO debit_notes;

-- 2. Restore debit_note_items table
DROP TABLE debit_note_items;
ALTER TABLE debit_note_items_backup_20260117 RENAME TO debit_note_items;

-- 3. Revert code changes
git checkout HEAD -- apps/api/src/purchase/services/grn.service.ts
git checkout HEAD -- apps/api/src/purchase/services/debit-note.service.ts

-- 4. Restart API
pnpm -C apps/api run start:dev
```

## Success Criteria

✅ All debit notes have GST columns populated  
✅ New debit notes created via QC include GST  
✅ Email template shows GST breakdown  
✅ GRN net payable calculations are correct  
✅ No errors in API logs  
✅ No database errors

## Support

If you encounter issues:

1. Check API logs: `tail -f logs/api.log`
2. Check database errors in Supabase logs
3. Run verification queries to identify data issues
4. Review DEBIT_NOTE_GST_FIX.md for implementation details

## Next Steps

After successful deployment:

1. Monitor debit notes created over next few days
2. Verify vendor emails are received correctly
3. Check accounting reports include GST properly
4. Update user documentation if needed
5. Clean up backup tables after 1 month:
   ```sql
   DROP TABLE IF EXISTS debit_notes_backup_20260117;
   DROP TABLE IF EXISTS debit_note_items_backup_20260117;
   ```

---
**Date Applied:** _____________  
**Applied By:** _____________  
**Status:** ⬜ Successful ⬜ Rollback Required  
**Notes:** _____________
