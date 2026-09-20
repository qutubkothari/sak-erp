# 🎉 Complete Debit Note & Accounts Payable System - Deployment Guide

## ✅ What's Been Built

### 1. **Debit Note Auto-Creation** (Backend)
- ✅ Automatically creates debit notes during QC Accept when items are rejected
- ✅ Calculates rejection amounts (qty × rate)
- ✅ Falls back to PO rates if GRN rate is missing
- ✅ Links debit notes to GRN and rejected items
- ✅ Updates GRN financial amounts (gross, debit, net payable)

### 2. **Debit Notes UI** (Frontend)
**Location:** `Purchase → Debit Notes`
- ✅ List all debit notes with filters (status, search)
- ✅ View debit note details with line items
- ✅ Approve debit notes (DRAFT → APPROVED)
- ✅ Send email to suppliers
- ✅ Track return status (PENDING, RETURNED, DESTROYED, REWORKED)
- ✅ Update debit note status workflow

### 3. **Accounts Payable Dashboard** (Frontend)
**Location:** `Accounts → Payables`
- ✅ Vendor-wise outstanding summary
- ✅ View vendor GRN breakdown
- ✅ Record payments against GRNs
- ✅ Track payment status and history

### 4. **GRN Financial Summary** (Frontend)
**Location:** `Purchase → GRN` (Details Modal)
- ✅ Shows Gross Amount, Debit Notes, Net Payable
- ✅ Displays rejected items with debit note links

### 5. **Email Integration** (Backend)
- ✅ Professional email templates for debit notes
- ✅ Sends debit note details to supplier email
- ✅ Updates status to SENT after email

### 6. **Payment Recording** (Backend + Frontend)
- ✅ Record payments with method, reference, date, notes
- ✅ Updates paid_amount and payment_status
- ✅ Calculates remaining balance
- ✅ Payment history tracking

---

## 🚀 Deployment Steps

### Step 1: Populate GRN Financial Data
Run this SQL in Supabase SQL Editor to populate financial amounts for existing GRNs:

```bash
# Copy and run populate-grn-financials.sql from your repo
```

**What it does:**
- Calculates `gross_amount` from grn_items (rate × received_qty)
- Sums `debit_note_amount` from approved debit notes
- Computes `net_payable_amount` = gross - debit
- Shows verification results

### Step 2: Verify Data
After running the SQL, verify:

```sql
-- Should show GRNs with financial amounts
SELECT 
  grn_number,
  gross_amount,
  debit_note_amount,
  net_payable_amount,
  payment_status
FROM grns
WHERE status = 'COMPLETED'
ORDER BY created_at DESC
LIMIT 5;

-- Should show debit notes
SELECT 
  debit_note_number,
  total_amount,
  status
FROM debit_notes
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🧪 Testing Guide

### Test 1: QC Accept with Rejections → Auto-Create Debit Note

1. **Create a GRN** (Purchase → GRN → + Create GRN)
   - Select PO with items
   - Enter received quantities
   - Save as DRAFT

2. **QC Accept with Rejections**
   - Click QC Accept button
   - Enter:
     - Accepted Qty: (e.g., 7 out of 10)
     - Rejected Qty: (e.g., 3)
     - Rejection Reason: "Quality issue - defective"
   - Click Submit

3. **Verify Debit Note Created**
   - ✅ See "Debit Note Created" badge in Rejected Items section
   - ✅ Click the badge to view debit note details
   - ✅ Financial Summary shows:
     - Gross Amount: (total received × rate)
     - Debit Notes: (rejected qty × rate)
     - Net Payable: (gross - debit)

4. **Check Debit Notes Page**
   - Navigate to `Purchase → Debit Notes`
   - ✅ New debit note appears with status DRAFT
   - ✅ Shows correct vendor, GRN number, amount

---

### Test 2: Approve & Email Debit Note

1. **Open Debit Note** (Purchase → Debit Notes → View Details)
   - ✅ Shows all rejected items with amounts
   - ✅ Shows rejection reasons

2. **Approve Debit Note**
   - Click "Approve" button
   - ✅ Confirms approval prompt
   - ✅ Status changes to APPROVED
   - ✅ GRN net_payable_amount updates automatically

3. **Send Email to Supplier**
   - Click "Send Email" button
   - ✅ Confirms email prompt
   - ✅ Status changes to SENT
   - ✅ Supplier receives professional email with:
     - Debit note details
     - Line items with rejection reasons
     - Total debit amount
     - Return instructions

---

### Test 3: View Accounts Payable

1. **Open Payables Dashboard** (Accounts → Payables)
   - ✅ Shows vendor-wise summary:
     - Total Gross Bills
     - Total Debit Notes
     - Net Payable
     - GRN Count

2. **View Vendor Details**
   - Click on vendor row
   - ✅ Shows all GRNs for that vendor
   - ✅ Each GRN shows gross, debit, net payable

3. **Check Financial Totals**
   - ✅ Totals match: Gross - Debit = Net Payable

---

### Test 4: Record Payment

1. **Select GRN for Payment** (Accounts → Payables → Vendor Details)
   - Click "Record Payment" button on a GRN

2. **Enter Payment Details**
   - Amount: (up to net payable)
   - Payment Method: NEFT/RTGS/CHEQUE/UPI/CASH
   - Reference: Transaction ID or cheque number
   - Date: Payment date
   - Notes: Optional remarks

3. **Submit Payment**
   - Click "Record Payment"
   - ✅ Payment recorded successfully
   - ✅ GRN payment_status updates:
     - UNPAID → PARTIAL (if amount < net_payable)
     - UNPAID → PAID (if amount = net_payable)
   - ✅ Vendor outstanding reduces

4. **Verify Payment History**
   - ✅ Payment appears in GRN payment history
   - ✅ Remaining balance shows correctly

---

### Test 5: Track Material Returns

1. **Open Debit Note Details** (Purchase → Debit Notes → View)
   - See rejected items with "PENDING" return status

2. **Update Return Status**
   - Click return status dropdown
   - Select: RETURNED/DESTROYED/REWORKED
   - Enter disposal notes
   - ✅ Status updates successfully

3. **Close Debit Note**
   - After all items handled, update DN status to CLOSED
   - ✅ Completes the cycle

---

## 📊 Key Features Checklist

### Backend (API)
- ✅ Auto-create debit notes on QC rejection
- ✅ Calculate rejection amounts with PO fallback
- ✅ Update GRN financial amounts
- ✅ Approve debit notes
- ✅ Send email to suppliers
- ✅ Record payments
- ✅ Track return status
- ✅ Vendor payables summary

### Frontend (UI)
- ✅ Debit Notes list page with filters
- ✅ Debit Note details view
- ✅ Approve workflow
- ✅ Email send button
- ✅ Return status tracking
- ✅ Accounts Payable dashboard
- ✅ Vendor GRN breakdown
- ✅ Payment recording modal
- ✅ GRN financial summary in details

### Database
- ✅ debit_notes table
- ✅ debit_note_items table
- ✅ GRN financial columns (gross, debit, net payable)
- ✅ Payment tracking columns
- ✅ Return status tracking
- ✅ Database triggers for auto-calculation

---

## 🎯 Business Flow Summary

```
1. GRN Created (DRAFT)
   ↓
2. QC Accept with Rejections
   ↓
3. Debit Note Auto-Created (DRAFT)
   ↓
4. Review & Approve Debit Note
   ↓
5. Send Email to Supplier
   ↓
6. Supplier Acknowledges
   ↓
7. Material Returned/Destroyed/Reworked
   ↓
8. Payment Made (Net Payable - Debit)
   ↓
9. Debit Note Closed
```

---

## 🔧 Troubleshooting

### Issue 1: Debit Note Not Created
**Symptoms:** QC Accept completes but no debit note appears

**Debug:**
```bash
# Check API logs
ssh -i "saif-erp.pem" ubuntu@13.205.17.214 "pm2 logs sak-api --lines 100 | grep -i debit"

# Look for:
# - "Rejected items after filter: X"
# - "Creating debit note..."
# - "Debit note DN-XXX created"
```

**Common Causes:**
- `rejection_amount` is 0 or NULL → Run populate SQL
- `qc_completed` already true → Reset to false
- No rejected items with qty > 0

**Fix:**
```sql
-- Reset qc_completed
UPDATE grns SET qc_completed = false WHERE id = 'YOUR_GRN_ID';

-- Populate rejection amounts
UPDATE grn_items
SET rejection_amount = rejected_qty * rate
WHERE rejected_qty > 0 AND (rejection_amount IS NULL OR rejection_amount = 0);
```

### Issue 2: Accounts Payable Shows No Data
**Cause:** GRN financial amounts not populated

**Fix:** Run `populate-grn-financials.sql`

### Issue 3: Email Not Sending
**Cause:** Email service not configured

**Check:**
```bash
# Verify email service is configured in environment
ssh -i "saif-erp.pem" ubuntu@13.205.17.214 "cat /home/ubuntu/sak-erp/apps/api/.env | grep MAIL"
```

**Required:**
- SMTP host, port, user, password
- FROM email address

---

## 📝 SQL Scripts Reference

### 1. `populate-grn-financials.sql`
Populates gross_amount, debit_note_amount, net_payable_amount for existing GRNs

### 2. `fix-grn-rejection-amount.sql`
Fixes rejection_amount = rejected_qty × rate

### 3. `check-all-debit-notes.sql`
Quick check of all debit notes and items

### 4. `reset-qc-completed.sql`
Resets qc_completed flag to allow re-testing QC Accept

### 5. `test-debit-note-flow.sql`
Comprehensive flow verification queries

---

## 🎉 Success Criteria

After deployment, you should be able to:

✅ **Create GRN with rejections** → Debit note auto-created
✅ **View debit notes list** → All DNs appear with correct amounts
✅ **Approve debit notes** → Status updates, GRN amounts adjust
✅ **Send emails** → Supplier receives professional debit note
✅ **View payables** → Vendor-wise outstanding shows correctly
✅ **Record payments** → Payment status updates, balance reduces
✅ **Track returns** → Material disposition tracked

---

## 🚀 Next Enhancements (Future)

1. **PDF Generation** - Generate debit note PDFs for download/email
2. **Aging Reports** - 30/60/90 day payables aging
3. **Payment Reminders** - Automated reminders for overdue payments
4. **Multi-Currency** - Support for foreign currency transactions
5. **Approval Workflow** - Multi-level approval for large debit notes
6. **Audit Trail** - Complete history of all debit note changes

---

## 📞 Support

If you encounter issues:
1. Check API logs: `pm2 logs sak-api`
2. Check browser console for frontend errors
3. Verify data with SQL scripts
4. Review this guide's troubleshooting section

---

**System Status:** ✅ FULLY OPERATIONAL
**Last Updated:** December 12, 2025
**Version:** 1.0.0
