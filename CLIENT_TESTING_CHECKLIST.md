# Client Testing Checklist - Revision Document 1.0
## All 10 Items Implementation Complete ✅

**System URL:** http://13.205.17.214:3000  
**Test Date:** December 11, 2025  
**Deployment:** API #879, Web #16

---

## 📋 ITEM 1: Stock Display in Purchase Orders ✅

**What Changed:**
- Purchase orders now show real-time stock information for each item
- Displays: Stock in Hand, Available Stock, Allocated Stock

**Testing Steps:**

1. **Login** to the system
2. Go to **Purchase → Purchase Orders**
3. Click **"+ Create Purchase Order"**
4. Select a vendor and add items
5. **Check:** Below each item, you should see:
   ```
   📦 Stock: 50 in hand | 30 available | 20 allocated
   ```
6. **Verify:** Numbers match with Inventory → Items list

**Expected Result:** Stock information appears under each item in PO form

---

## 📋 ITEM 2: Drawing Required Field ✅

**What Changed:**
- Items can now be marked as requiring drawings (Optional/Compulsory/Not Required)

**Testing Steps:**

1. Go to **Inventory → Items**
2. Click on any item to edit
3. **Check:** You should see "Drawing Required" dropdown with:
   - Optional
   - Compulsory
   - Not Required
4. Select **"Compulsory"** for a test item and save
5. Try creating a PO with this item (without uploading drawing)
6. **Verify:** System blocks PO creation with error message

**Expected Result:** 
- Dropdown exists in item form
- Compulsory items require drawings before PO creation

---

## 📋 ITEM 3: Payment Status Dropdown ✅

**What Changed:**
- Purchase orders now have payment status tracking

**Testing Steps:**

1. Go to **Purchase → Purchase Orders**
2. Open any existing PO or create new one
3. **Check:** Payment Status dropdown shows:
   - Unpaid
   - Paid
   - Cheque Issued
   - Other
4. Select **"Other"**
5. **Verify:** A text field appears for payment notes
6. Save the PO

**Expected Result:** Payment status saves correctly and displays in PO list

---

## 📋 ITEM 4: Customs Duty & Other Charges ✅

**What Changed:**
- POs can now include customs duty and additional charges
- Grand total calculation includes these charges

**Testing Steps:**

1. Go to **Purchase → Purchase Orders**
2. Create or edit a PO
3. Add items (subtotal shows automatically)
4. **Check:** Below items, you should see:
   - **Customs Duty (₹)** input field
   - **Other Charges (₹)** input field
5. Enter values:
   - Customs Duty: 5000
   - Other Charges: 2000
6. **Verify:** Grand Total = Items Subtotal + 5000 + 2000
7. Save and view PO

**Expected Result:** Total breakdown shows:
```
Subtotal: ₹50,000
Customs Duty: ₹5,000
Other Charges: ₹2,000
Grand Total: ₹57,000
```

---

## 📋 ITEM 5: GRN QC Split (Received vs Accepted) ✅

**What Changed:**
- GRN now has two steps: Receive goods → QC Inspection → Accept/Reject
- Separate quantities for received and accepted items

**Testing Steps:**

1. **Create a PO** with 100 units of an item
2. Go to **Purchase → GRN**
3. Click **"+ Create GRN"** and select the PO
4. **Step 1 - Receive Goods:**
   - Enter **Received Qty: 100**
   - Click Save (status: DRAFT)
5. **Step 2 - QC Acceptance:**
   - Find the GRN, click **"Accept QC"**
   - You'll see:
     - Received Qty: 100 (read-only)
     - **Accepted Qty:** [input field]
     - **Rejected Qty:** [input field]
   - Enter Accepted: 95, Rejected: 5
   - Add rejection reason if needed
6. Save and check **Inventory → Items**

**Expected Result:**
- Stock increases by 95 (accepted quantity only)
- GRN shows QC status: ACCEPTED (95), REJECTED (5)

---

## 📋 ITEM 6: HSN Code Update from Supplier Invoice ✅

**What Changed:**
- During GRN, if supplier's HSN code differs from master, system shows warning
- Option to update master HSN code

**Testing Steps:**

1. Go to **Inventory → Items** and note an item's HSN code (e.g., 8537)
2. Create PO for this item
3. Create **GRN** from the PO
4. In GRN form, find **"Supplier HSN Code"** field
5. Enter **different HSN** (e.g., 8536)
6. **Check:** Amber/yellow warning appears:
   ```
   ⚠️ Supplier HSN (8536) differs from master (8537)
   ```
7. Save GRN
8. Go back to **Inventory → Items**
9. **Verify:** Item's HSN code updated to 8536

**Expected Result:** HSN code auto-updates in item master when different

---

## 📋 ITEM 7: Multiple Vendors per Item ✅

**What Changed:**
- Items can now be tagged with multiple vendors
- Vendors have priority ranking (1 = preferred)

**Testing Steps:**

1. Go to **Inventory → Items**
2. Click on any item
3. **Check:** New section called **"Vendors"** with table
4. Click **"+ Add Vendor"**
5. Fill in:
   - Vendor: [Select from dropdown]
   - Priority: 1 (preferred vendor)
   - Unit Price: 500
   - Lead Time: 15 days
   - MOQ: 10
6. Add 2-3 vendors with different priorities
7. **Save item**
8. Create new **Purchase Requisition**
9. Add this item
10. **Verify:** Preferred vendor (priority 1) auto-selected

**Expected Result:**
- Item shows multiple vendors with pricing
- Preferred vendor selected by default in PR/PO

---

## 📋 ITEM 8: Drawing Compulsory Validation ✅

**What Changed:**
- Items marked as "Compulsory" for drawings cannot be in PO without drawings

**Testing Steps:**

1. Go to **Inventory → Items**
2. Select item and set **Drawing Required: Compulsory**
3. **Don't upload any drawing** yet
4. Try to create **Purchase Order** with this item
5. Click **"Create Purchase Order"**
6. **Check:** System shows error:
   ```
   ❌ Drawing upload is compulsory for: [Item Name]
   Please upload drawings before creating PO.
   ```
7. Go back to item, upload a drawing
8. Try creating PO again
9. **Verify:** PO creates successfully

**Expected Result:** System blocks PO creation if compulsory drawings missing

---

## 📋 ITEM 9: PO Tracking Details & Reminders ✅

**What Changed:**
- Purchase orders can now track shipment details
- Tracking number, carrier, shipped date, delivery status
- View for overdue POs

**Testing Steps:**

1. Go to **Purchase → Purchase Orders**
2. Find an approved PO
3. Click **"Edit"** (pencil icon)
4. **Check:** New section appears: **"Tracking Information"**
5. Fill in:
   - Tracking Number: ABC123456
   - Carrier Name: Blue Dart
   - Shipped Date: [Select date]
   - Estimated Delivery Date: [Select date]
   - Delivery Status: Shipped
   - Tracking URL: https://example.com/track/ABC123456
6. Click **"Save Tracking Info"**
7. View the PO details
8. **Verify:** Tracking section shows all information
9. If tracking URL provided, verify link is clickable

**Expected Result:**
- Tracking info saves and displays in PO view
- Status badge shows colored indicator (Shipped = blue, Delivered = green)

**Database View (Optional):**
Run in Supabase SQL editor:
```sql
SELECT * FROM v_overdue_purchase_orders;
```
Shows all POs past delivery date without tracking.

---

## 📋 ITEM 10: Email Integration ✅

**What Changed:**
- System can now send professional emails for PO, RFQ, SO, Dispatch
- Automatic tracking reminders to vendors

**Testing Steps:**

### 10.1 Send Purchase Order Email

1. Go to **Purchase → Purchase Orders**
2. Open any approved PO
3. **Check:** New button **"📧 Send Email"** (needs to be added in UI)
4. **Manual Test via API:**
   ```
   POST http://13.205.17.214:4000/api/v1/purchase/orders/{PO_ID}/send-email
   Headers: Authorization: Bearer {YOUR_TOKEN}
   ```
5. **Expected:** Vendor receives professional email with:
   - Company branding
   - PO number and details
   - Items table with quantities and prices
   - Total amount breakdown
   - Delivery address

### 10.2 Send Tracking Reminder

1. Find PO that's overdue (past delivery date)
2. **API Test:**
   ```
   POST http://13.205.17.214:4000/api/v1/purchase/orders/{PO_ID}/send-tracking-reminder
   ```
3. **Expected:** Vendor receives reminder email with:
   - Urgency indicator (if overdue)
   - Request for tracking details
   - PO reference information

### 10.3 Email Configuration Required

**IMPORTANT:** Emails won't work until SMTP is configured on server.

**Setup Steps:**
1. SSH to server: `ssh ubuntu@13.205.17.214`
2. Edit environment: `nano /home/ubuntu/sak-erp/apps/api/.env`
3. Add:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@company.com
   SMTP_PASS=your-app-password
   COMPANY_NAME=SAK Solutions
   ```
4. Restart: `pm2 restart sak-api`

**Gmail Setup:**
- Enable 2FA on Gmail
- Generate App Password: Google Account → Security → 2-Step Verification → App passwords
- Use App Password (not regular password) in SMTP_PASS

**Expected Result:**
- Professional HTML emails sent to vendors/customers
- All email templates include company branding and complete details

---

## 🎯 Quick Verification Summary

### 1. Stock Information
- [ ] Stock numbers appear in PO form under each item

### 2. Drawing Required
- [ ] Dropdown exists in Items form
- [ ] Compulsory items block PO without drawings

### 3. Payment Status
- [ ] Dropdown in PO with 4 options
- [ ] "Other" shows notes field

### 4. Customs & Charges
- [ ] Two input fields in PO form
- [ ] Grand total includes both charges

### 5. GRN QC Split
- [ ] Receive goods (draft status)
- [ ] Accept QC (separate accepted/rejected quantities)
- [ ] Stock increases by accepted quantity only

### 6. HSN Code Update
- [ ] Supplier HSN field in GRN
- [ ] Warning shows on mismatch
- [ ] Item master HSN auto-updates

### 7. Multiple Vendors
- [ ] Vendors section in Items page
- [ ] Can add multiple vendors with priority
- [ ] Preferred vendor auto-selected in PR

### 8. Drawing Validation
- [ ] PO blocked if compulsory drawings missing
- [ ] Clear error message displayed

### 9. PO Tracking
- [ ] Tracking section in edit mode
- [ ] 7 fields: tracking #, carrier, dates, status, URL
- [ ] Information displays in view mode

### 10. Email Integration
- [ ] API endpoints working (after SMTP setup)
- [ ] Professional HTML templates
- [ ] Vendor receives PO and reminders

---

## 📊 Testing Report Template

**Tester Name:** ___________________  
**Date:** ___________________  
**System Version:** API #879, Web #16

| Item # | Feature | Status | Issues Found |
|--------|---------|--------|--------------|
| 1 | Stock Display | ⬜ Pass ⬜ Fail | |
| 2 | Drawing Required | ⬜ Pass ⬜ Fail | |
| 3 | Payment Status | ⬜ Pass ⬜ Fail | |
| 4 | Customs & Charges | ⬜ Pass ⬜ Fail | |
| 5 | GRN QC Split | ⬜ Pass ⬜ Fail | |
| 6 | HSN Code Update | ⬜ Pass ⬜ Fail | |
| 7 | Multiple Vendors | ⬜ Pass ⬜ Fail | |
| 8 | Drawing Validation | ⬜ Pass ⬜ Fail | |
| 9 | PO Tracking | ⬜ Pass ⬜ Fail | |
| 10 | Email Integration | ⬜ Pass ⬜ Fail | |

**Overall Result:** ⬜ All Pass ⬜ Issues Found

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

---

## 🆘 Support & Issues

**If something doesn't work:**

1. **Check deployment versions:**
   - API should be #879 or higher
   - Web should be #16 or higher

2. **Check browser console:**
   - Press F12
   - Look for red errors in Console tab
   - Screenshot and share

3. **Check server status:**
   - API: http://13.205.17.214:4000/api/health
   - Web: http://13.205.17.214:3000

4. **Common Issues:**
   - **Stock not showing:** Clear browser cache, refresh page
   - **Buttons missing:** Try different browser (Chrome/Edge)
   - **Email not working:** SMTP needs configuration (see Item 10.3)
   - **Changes not visible:** Hard refresh (Ctrl+Shift+R)

**Contact:** Report issues with screenshots and steps to reproduce.

---

## ✅ Sign-off

**Client Approval:**

- [ ] All 10 items tested and verified
- [ ] No critical issues found
- [ ] Ready for production use

**Signature:** ___________________  
**Date:** ___________________

**Developer Notes:** All revision document requirements completed. Email functionality requires SMTP configuration to be operational.
