# Debit Note GST Calculation - Implementation Complete

## Problem
Debit notes were not calculating or storing GST amounts. When materials were rejected during QC, the debit note only included the base amount without GST, which was incorrect for accounting purposes.

## Solution
Added comprehensive GST calculation to the debit notes system at multiple levels:

### 1. Database Schema Changes (`add-gst-to-debit-notes.sql`)

**debit_notes table:**
- Added `gross_amount` - Base amount before GST
- Added `gst_percentage` - GST rate (default 18%)
- Added `tax_amount` - Calculated GST amount
- Modified `total_amount` - Now represents gross + tax

**debit_note_items table:**
- Added `gst_percentage` - GST rate per item
- Added `tax_amount` - Tax amount per line item

**Updated trigger `update_grn_payable_amount`:**
- Now correctly uses debit note's `total_amount` (which includes GST)
- Formula: `net_payable = (grn_gross + grn_tax) - debit_note_total_with_gst`

### 2. Backend Service Changes

**apps/api/src/purchase/services/grn.service.ts:**
- Modified `createDebitNoteForRejections()` function:
  - Retrieves GRN's GST percentage
  - Calculates gross amount (sum of rejected items)
  - Calculates tax amount based on GST percentage
  - Stores both gross and total amounts in debit note
  - Creates debit note items with individual GST calculations

**apps/api/src/purchase/services/debit-note.service.ts:**
- Modified `create()` function for manual debit notes:
  - Accepts GST percentage (defaults to 18%)
  - Calculates tax on gross amount
  - Stores GST breakdown in items
- Updated `sendEmail()` function:
  - Email now shows GST breakdown
  - Displays: Amount + GST% + Tax = Total
  - Clear indication that total includes GST

### 3. Calculation Flow

**When QC rejects items:**
1. System calculates gross amount: `sum(rejected_qty × unit_price)`
2. System retrieves GRN's GST percentage (default 18%)
3. System calculates tax: `gross_amount × (gst_percentage / 100)`
4. System calculates total: `gross_amount + tax_amount`
5. Debit note created with all three values stored
6. Each line item also stores its GST calculation

**When GRN net payable is calculated:**
- GRN gross amount + GRN tax - Debit note total (with GST) = Net Payable

### 4. Email Template Enhancement

The debit note email now shows:
```
Item | Qty | Price | Amount | GST% | Tax | Total | Reason
-------------------------------------------------------------
...
                      Subtotal:  ₹10,000.00
                      GST (18%):  ₹1,800.00
                      ──────────────────────
                      Total:     ₹11,800.00
```

## Migration Steps

1. **Run the migration:**
   ```sql
   -- Execute add-gst-to-debit-notes.sql
   ```

2. **Existing data:**
   - Migration automatically backfills existing debit notes
   - Assumes old `total_amount` was gross amount
   - Recalculates with 18% GST

3. **Restart API service:**
   - New debit notes will include GST automatically
   - QC rejections will create properly calculated debit notes

## Testing Checklist

- [ ] Run migration SQL file
- [ ] Create a new GRN with rejected items
- [ ] Verify debit note shows: gross_amount, tax_amount, total_amount
- [ ] Check debit_note_items have gst_percentage and tax_amount
- [ ] Verify GRN net_payable_amount is correct after debit note
- [ ] Send test debit note email - verify GST breakdown displays
- [ ] Create manual debit note via API - verify GST calculated
- [ ] Check existing debit notes were backfilled correctly

## Files Changed

1. `add-gst-to-debit-notes.sql` - NEW migration file
2. `apps/api/src/purchase/services/grn.service.ts` - GST calculation in auto-create
3. `apps/api/src/purchase/services/debit-note.service.ts` - GST in manual create and emails

## Impact

✅ **Accounting Accuracy:** Debit notes now match actual financial impact (including GST)  
✅ **Compliance:** Proper GST breakdown for tax reporting  
✅ **Vendor Communication:** Clear GST breakdown in emails  
✅ **GRN Net Payable:** Correctly reflects deductions with GST  
✅ **Backwards Compatible:** Existing debit notes automatically migrated
