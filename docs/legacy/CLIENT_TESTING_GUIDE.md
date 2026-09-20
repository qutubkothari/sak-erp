# 🧪 Client Testing Guide - Debit Note & Dashboard System

**Date:** December 12, 2025  
**System Version:** Production-Clean Branch  
**Features Ready for Testing:** 11 Major Features

---

## 📋 Overview

This guide covers the complete Debit Note Management System and Dashboard improvements deployed to your ERP. All features are live and ready for testing.

---

## ✅ Feature List

### 1️⃣ **Automatic Debit Note Creation on QC Rejection**

**What it does:** When you accept a GRN with rejected items in Quality Control, the system automatically creates a debit note for the rejected quantities.

**How to test:**
1. Go to **Purchase → GRN (Goods Receipt Notes)**
2. Select any GRN with items that have rejected quantities
3. Click **QC Accept** button
4. System will automatically create a debit note for the rejected items
5. You'll see a success message: "Debit note created: DN-xxxxx"

**What to verify:**
- ✓ Debit note appears in Purchase → Debit Notes
- ✓ Total amount = Sum of (rejected_qty × rate) for all rejected items
- ✓ Status shows as "DRAFT"
- ✓ All rejected items listed in debit note details

---

### 2️⃣ **Debit Notes Dashboard**

**What it does:** Central page to view, search, filter, and manage all debit notes.

**How to test:**
1. Navigate to **Purchase → Debit Notes**
2. Browse the list of all debit notes
3. Use the search bar to find specific debit notes
4. Click on any debit note to view full details

**What to verify:**
- ✓ Table shows: Debit Note Number, GRN Number, Vendor, Amount, Status, Date
- ✓ Search works for debit note numbers and vendor names
- ✓ Status badges display correctly (Draft, Approved, Sent, etc.)
- ✓ Clicking a row opens the detail page

---

### 3️⃣ **Debit Note Details & Approval**

**What it does:** View complete debit note information and approve it for processing.

**How to test:**
1. Go to **Purchase → Debit Notes**
2. Click on any debit note in DRAFT status
3. Review all details (items, quantities, rates, amounts)
4. Click **Approve** button
5. Confirm the approval in the dialog

**What to verify:**
- ✓ All item details show correctly with rates and rejection amounts
- ✓ Total amount is accurate
- ✓ GRN and vendor information displayed
- ✓ After approval, status changes to "APPROVED"
- ✓ Approve button is disabled after approval

---

### 4️⃣ **Email Debit Note to Supplier**

**What it does:** Send debit note via email to the supplier with full details.

**How to test:**
1. Open any **APPROVED** debit note
2. Click **Send Email** button
3. System sends email to supplier's registered email address
4. Status changes to "SENT"

**What to verify:**
- ✓ Email sent confirmation message appears
- ✓ Debit note status updates to "SENT"
- ✓ Check supplier's email inbox for the debit note email
- ✓ Email contains all debit note details and amounts

---

### 5️⃣ **Material Return Status Tracking**

**What it does:** Track the disposition of rejected materials (returned, destroyed, reworked).

**How to test:**
1. Open any debit note
2. Scroll to the **Return Status** section
3. Select status: PENDING, RETURNED, DESTROYED, or REWORKED
4. Add notes about the disposition
5. Click **Update Status**

**What to verify:**
- ✓ Status updates successfully
- ✓ Return date is automatically set when status changes from PENDING
- ✓ Notes are saved and displayed
- ✓ Status badge updates in the UI

---

### 6️⃣ **Accounts Payable Dashboard**

**What it does:** Shows all outstanding vendor payments with GRN-wise breakdown.

**How to test:**
1. Navigate to **Accounts → Payables**
2. View vendor summary cards at the top
3. Browse the GRN breakdown table
4. Click on vendor cards to filter by vendor

**What to verify:**
- ✓ Vendor cards show: Name, Outstanding Amount, GRN Count
- ✓ GRN table displays: GRN Number, Vendor, Gross Amount, Debit Note Amount, Net Payable
- ✓ Dates display correctly (not "Invalid Date")
- ✓ Amounts are accurate and formatted with ₹ symbol
- ✓ Clicking vendor card filters the table

---

### 7️⃣ **Payment Recording System**

**What it does:** Record vendor payments and track payment status for each GRN.

**How to test:**
1. Go to **Accounts → Payables**
2. Find a GRN with outstanding amount
3. Click the **Record Payment** button
4. Enter payment amount, date, and reference
5. Submit the payment

**What to verify:**
- ✓ Payment modal opens with pre-filled GRN details
- ✓ Can enter partial or full payment amount
- ✓ Payment date picker works
- ✓ After submission, outstanding amount decreases
- ✓ Payment status updates (UNPAID → PARTIAL → PAID)

---

### 8️⃣ **GRN Financial Summary**

**What it does:** Enhanced GRN view showing complete financial breakdown.

**How to test:**
1. Go to **Purchase → GRN**
2. View any completed GRN
3. Check the financial summary section

**What to verify:**
- ✓ Shows Gross Amount (total received value)
- ✓ Shows Debit Note Amount (rejections)
- ✓ Shows Net Payable Amount (gross - debit)
- ✓ Amounts match the calculations
- ✓ Display is clear and formatted properly

---

### 9️⃣ **Dashboard Purchase Order Widget**

**What it does:** Main dashboard now correctly displays pending purchase order counts.

**How to test:**
1. Navigate to **Dashboard** (home page)
2. Look at the "Pending Purchase Orders" widget
3. Number should match your actual POs in DRAFT, PENDING, or APPROVED status

**What to verify:**
- ✓ Widget shows correct count (not 0 if you have POs)
- ✓ Clicking widget navigates to Purchase Orders page
- ✓ Count updates when you create new POs

**Bug Fixed:** Was showing 0 even with existing POs due to wrong status filter.

---

### 🔟 **Rejection Amount Auto-Calculation**

**What it does:** System automatically calculates rejection amounts (rejected_qty × rate) for all rejected items.

**How to test:**
1. Create or view a GRN with rejected quantities
2. Check the grn_items table or debit note
3. Rejection amount should be automatically populated

**What to verify:**
- ✓ rejection_amount = rejected_qty × rate
- ✓ No manual calculation needed
- ✓ Works for all existing and new GRNs
- ✓ Debit notes use these calculated amounts

---

### 1️⃣1️⃣ **Complete Database Financial Setup**

**What it does:** One-time SQL setup that populated all historical GRN financial data.

**What was done:**
- Created financial tracking columns (gross_amount, debit_note_amount, net_payable_amount)
- Populated all historical data from existing GRNs
- Fixed missing rejection amounts for all GRN items
- Ensured all debit notes have proper statuses

**How to verify:**
1. Check **Accounts → Payables** - all GRNs should have financial data
2. All amounts should be populated (not null or 0)
3. Net payable = Gross - Debit note amount
4. Historical GRNs now show complete financial information

---

## 🎯 Complete End-to-End Test Scenario

**Full Workflow Test:** GRN → QC → Debit Note → Email → Payment

1. **Create GRN** with some items having rejected quantities
2. **QC Accept** the GRN → System auto-creates debit note
3. **View Debit Note** in Purchase → Debit Notes
4. **Approve** the debit note
5. **Send Email** to supplier
6. **Update Return Status** (e.g., RETURNED)
7. **Go to Accounts → Payables** → See the GRN with updated amounts
8. **Record Payment** for the net payable amount
9. **Verify** payment status updated

---

## 📊 Data to Check

### Debit Notes Page
- Should see all auto-created debit notes
- Status progression: DRAFT → APPROVED → SENT → ACKNOWLEDGED → CLOSED

### Accounts Payable Page
- Vendor cards with outstanding amounts
- GRN-wise breakdown with financial details
- Dates showing correctly (not "Invalid Date")

### Dashboard
- Pending Purchase Orders count (should match your actual POs)
- Other widgets (Sales Orders, Production, Ready to Ship) will show 0 if no data exists

---

## ⚠️ Important Notes

1. **Email Configuration:** Ensure SMTP settings are configured for email functionality
2. **Permissions:** User must have appropriate roles to approve debit notes and record payments
3. **Date Display:** All dates now display correctly (no "Invalid Date" errors)
4. **Currency:** All amounts displayed in ₹ (Indian Rupees)
5. **Status Filters:** Dashboard uses correct status values (DRAFT, PENDING, APPROVED, not PENDING_APPROVAL)

---

## 🐛 Known Issues - RESOLVED

All issues have been fixed in this deployment:

✅ DN not creating on QC Accept → FIXED  
✅ Missing rejection amounts → FIXED  
✅ Date showing "Invalid Date" → FIXED  
✅ Dashboard showing 0 for POs → FIXED  
✅ Email functionality → WORKING  
✅ Payment recording → WORKING  

---

## 📞 Support

If you encounter any issues during testing:

1. **Check Browser Console** (F12) for error messages
2. **Verify Data** - Ensure GRNs have proper item rates and quantities
3. **Clear Cache** - Hard refresh (Ctrl+Shift+R) if UI doesn't update
4. **Screenshots** - Capture any error messages or unexpected behavior

---

## ✨ Summary

You now have a **complete Debit Note Management System** with:
- ✅ Automatic debit note creation
- ✅ Approval workflow
- ✅ Email notifications
- ✅ Material return tracking
- ✅ Accounts payable dashboard
- ✅ Payment recording
- ✅ Financial summaries
- ✅ Working dashboard widgets

**All features are live and ready for production use!** 🚀

---

*Last Updated: December 12, 2025*  
*Deployment: Production-Clean Branch*  
*PM2 Process: sak-api (#933), sak-web (#11)*
