# 📋 SAK ERP - Complete Testing Guide for Client

## 🎯 Purpose
This document will guide you through testing the complete Manufacturing ERP system from start to finish. Follow each step carefully to ensure all modules work correctly.

---

## ⚠️ BEFORE YOU START

### Step 0: Clean Up Existing Data
1. **Login to Supabase**: https://supabase.com/dashboard
2. **Open your project**: `nwkaruzvzwwuftjquypk`
3. **Go to SQL Editor** (left sidebar)
4. **Copy the contents** of file: `database/CLEANUP_ALL_DATA.sql`
5. **Paste in SQL Editor** and click **"Run"**
6. **Wait for completion** (should take 10-30 seconds)
7. **Verify cleanup** - The verification queries at the end should show 0 records

**✅ System is now clean and ready for testing**

---

## 🔐 PHASE 1: LOGIN & SETUP (5 minutes)

### Step 1.1: Access the System
1. **Open browser**: Chrome or Edge (recommended)
2. **Navigate to**: http://13.205.17.214:3000
3. **You should see**: Login page

### Step 1.2: Login
**Use these credentials:**
- **Email**: `admin@sakerp.com`
- **Password**: `Admin@123`

**Expected Result**: You should see the Dashboard with various modules

---

## 🏭 PHASE 2: MASTER DATA SETUP (15 minutes)

### Step 2.1: Create Vendors (Suppliers)

1. **Navigate**: Dashboard → **Purchase** → **Vendors**
2. **Click**: "+ Add Vendor" button
3. **Enter Vendor 1 Details**:
   ```
   Vendor Code: VEND-001
   Vendor Name: ABC Steel Industries
   Contact Person: Rajesh Kumar
   Email: rajesh.kumar@abcsteel.com
   Phone: +91-9876543210
   Address: Plot 45, Industrial Area, Phase 2, Gurgaon, Haryana - 122015
   GST Number: 06ABCDE1234F1Z5
   Payment Terms: Net 30 Days
   Status: Active
   ```
4. **Click**: "Save"
5. **Repeat for Vendor 2**:
   ```
   Vendor Code: VEND-002
   Vendor Name: XYZ Bearings Ltd
   Contact Person: Amit Sharma
   Email: amit.sharma@xyzbearings.com
   Phone: +91-9876543211
   Address: 23, Bearing Complex, MIDC, Pune, Maharashtra - 411019
   GST Number: 27XYZAB5678G1H9
   Payment Terms: Net 30 Days
   Status: Active
   ```
6. **Repeat for Vendor 3**:
   ```
   Vendor Code: VEND-003
   Vendor Name: PowerTech Motors
   Contact Person: Suresh Mehta
   Email: suresh@powertechmotors.com
   Phone: +91-9876543212
   Address: Motor Industrial Estate, Coimbatore, Tamil Nadu - 641014
   GST Number: 33PQRST9012I2J3
   Payment Terms: Net 45 Days
   Status: Active
   ```

**✅ Expected Result**: 3 vendors visible in vendors list

---

### Step 2.2: Create Items (Raw Materials & Finished Goods)

1. **Navigate**: Dashboard → **Inventory** → **Items**
2. **Click**: "+ Create Item" button

**Create Raw Material 1**:
```
Item Code: RM-STEEL-001
Item Name: Stainless Steel Plate 304
Description: 2mm thick SS304 plate
Category: Raw Material
Item Type: Raw Material
UOM: KG
Reorder Level: 500
Reorder Quantity: 1000
Lead Time: 7 days
Status: Active
```

**Create Raw Material 2**:
```
Item Code: RM-BEARING-001
Item Name: Ball Bearing 6205
Description: High precision ball bearing
Category: Raw Material
Item Type: Raw Material
UOM: PCS
Reorder Level: 100
Reorder Quantity: 500
Lead Time: 10 days
Status: Active
```

**Create Raw Material 3**:
```
Item Code: RM-MOTOR-001
Item Name: Electric Motor 500W
Description: 3-phase 500W motor
Category: Raw Material
Item Type: Raw Material
UOM: PCS
Reorder Level: 50
Reorder Quantity: 200
Lead Time: 14 days
Status: Active
```

**Create Finished Good**:
```
Item Code: FG-PUMP-001
Item Name: Industrial Water Pump 500W
Description: Heavy duty water pump assembly
Category: Finished Goods
Item Type: Finished Product
UOM: PCS
Reorder Level: 20
Reorder Quantity: 50
Lead Time: 0 days
Status: Active
```

**✅ Expected Result**: 4 items visible (3 RM + 1 FG)

---

### Step 2.3: Create Customers

1. **Navigate**: Dashboard → **Sales**
2. **Click**: "+ Add Customer" button

**Create Customer 1**:
```
Customer Code: CUST-001
Customer Name: TechCorp Industries Pvt Ltd
Contact Person: Priya Desai
Email: priya.desai@techcorp.com
Phone: +91-9876543220
Address: Tower A, Cyber City, Mumbai, Maharashtra - 400001
GST Number: 27TECH123456K1L7
Credit Limit: 500000
Payment Terms: Net 30 Days
Status: Active
```

**Create Customer 2**:
```
Customer Code: CUST-002
Customer Name: BuildTech Solutions
Contact Person: Vikram Singh
Email: vikram@buildtech.com
Phone: +91-9876543221
Address: Industrial Plot 12, Noida, UP - 201301
GST Number: 09BUILD78901M2N4
Credit Limit: 300000
Payment Terms: Net 45 Days
Status: Active
```

**✅ Expected Result**: 2 customers visible in sales page

---

## 📦 PHASE 3: PROCUREMENT FLOW (20 minutes)

### Step 3.1: Create Purchase Requisition (PR)

1. **Navigate**: Dashboard → **Purchase** → **Requisitions**
2. **Click**: "+ Create PR" button
3. **Enter PR Details**:
   ```
   PR Number: (Auto-generated, e.g., PR-2025-11-001)
   Requested By: Your Name
   Department: Production
   Priority: High
   Required Date: (Select tomorrow's date)
   Notes: Materials needed for pump production
   ```
4. **Add Items**:
   - **Item 1**: 
     - Item: RM-STEEL-001 (Stainless Steel Plate 304)
     - Quantity: 100 KG
     - Estimated Price: 350 per KG
   - **Item 2**:
     - Item: RM-BEARING-001 (Ball Bearing 6205)
     - Quantity: 50 PCS
     - Estimated Price: 150 per PCS
   - **Item 3**:
     - Item: RM-MOTOR-001 (Electric Motor 500W)
     - Quantity: 25 PCS
     - Estimated Price: 2500 per PCS
5. **Click**: "Submit PR"
6. **Status should change to**: "PENDING_APPROVAL"

**✅ Expected Result**: PR created with 3 items, status PENDING_APPROVAL

---

### Step 3.2: Create Purchase Order (PO)

1. **Navigate**: Dashboard → **Purchase** → **Orders**
2. **Click**: "+ Create PO" button
3. **You can select PR**: Choose the PR you just created (it will auto-fill items)
4. **Enter PO Details**:
   ```
   PO Number: (Auto-generated, e.g., PO-2025-11-001)
   Vendor: VEND-001 (ABC Steel Industries)
   Expected Delivery Date: (Select 7 days from today)
   Payment Terms: Net 30 Days
   Shipping Address: Your Plant Address
   Notes: Urgent requirement for production
   ```
5. **Verify Items** (should be pre-filled from PR):
   - Steel Plate: 100 KG @ 350 = 35,000
   - Bearing: 50 PCS @ 150 = 7,500
   - Motor: 25 PCS @ 2,500 = 62,500
   - **Total**: 105,000 (before tax)
6. **Click**: "Create Purchase Order"
7. **Status should be**: "PENDING"

**✅ Expected Result**: PO created, total = 105,000

---

### Step 3.3: Create GRN (Goods Receipt Note)

1. **Navigate**: Dashboard → **Purchase** → **GRN**
2. **Click**: "+ Create GRN" button
3. **Enter GRN Details**:
   ```
   GRN Number: (Auto-generated, e.g., GRN-2025-11-001)
   PO Number: Select the PO you just created
   Vendor: (Auto-filled from PO)
   Received Date: Today's date
   Invoice Number: INV-ABC-2025-001
   Invoice Date: Today's date
   Vehicle Number: DL-01-AB-1234
   Received By: Your Name
   Notes: All items received in good condition
   ```
4. **Verify Items** (auto-filled from PO)
5. **Enter Batch Details for each item**:
   - **Steel Plate**:
     - Received Quantity: 100
     - Batch Number: BATCH-STEEL-001
     - Expiry Date: (1 year from today)
     - QC Status: PASSED
   - **Bearing**:
     - Received Quantity: 50
     - Batch Number: BATCH-BEAR-001
     - Expiry Date: (2 years from today)
     - QC Status: PASSED
   - **Motor**:
     - Received Quantity: 25
     - Batch Number: BATCH-MOTOR-001
     - Expiry Date: (1 year from today)
     - QC Status: PASSED
6. **Click**: "Create GRN"

**✅ Expected Result**: 
- GRN created
- UIDs automatically generated for each item (you'll see them in UID Tracking)
- Inventory updated

---

## 🔍 PHASE 4: UID TRACKING VERIFICATION (10 minutes)

### Step 4.1: View Generated UIDs

1. **Navigate**: Dashboard → **UID Tracking**
2. **You should see**: Multiple UIDs created (one for each received item)
3. **UIDs will look like**: 
   - `UID-SAIF-KOL-RM-000001-XX` (Steel)
   - `UID-SAIF-KOL-RM-000002-YY` (Bearing)
   - `UID-SAIF-KOL-RM-000003-ZZ` (Motor)

### Step 4.2: Search for a UID

1. **In the search box**, enter one of the UIDs (e.g., `UID-SAIF-KOL-RM-000001`)
2. **Click**: "Search"
3. **You should see**:
   - Current Status: AVAILABLE
   - Location: Your warehouse
   - Lifecycle history showing RECEIVED event
   - Batch number
   - Vendor details

**✅ Expected Result**: UID details showing complete information

---

### Step 4.3: Test Trace Product Feature

1. **On UID Tracking page**, click **"🔍 Trace Product"** button (top right)
2. **Enter a UID** from the list
3. **Click**: "Trace Product"
4. **You should see**:
   - **Visual Timeline**: Shows RECEIVED event
   - **Vendor Details**: ABC Steel Industries details
   - **Quality Checkpoints**: QC PASSED entry
   - **Component Tree**: Empty (since this is raw material)
   - **Customer Location**: Empty (not shipped yet)

**✅ Expected Result**: Complete trace information displayed

---

## 🏭 PHASE 5: PRODUCTION FLOW (25 minutes)

### Step 5.1: Create BOM (Bill of Materials)

1. **Navigate**: Dashboard → **BOM**
2. **Click**: "+ Create BOM" button
3. **Enter BOM Details**:
   ```
   BOM Number: (Auto-generated, e.g., BOM-2025-11-001)
   Product: FG-PUMP-001 (Industrial Water Pump)
   Version: 1.0
   Effective Date: Today
   Status: Active
   Notes: Standard BOM for 500W pump assembly
   ```
4. **Add Components**:
   - **Component 1**:
     - Item: RM-STEEL-001 (Steel Plate)
     - Quantity: 2 KG
     - Scrap %: 5%
     - Sequence: 1
   - **Component 2**:
     - Item: RM-BEARING-001 (Bearing)
     - Quantity: 2 PCS
     - Scrap %: 0%
     - Sequence: 2
   - **Component 3**:
     - Item: RM-MOTOR-001 (Motor)
     - Quantity: 1 PCS
     - Scrap %: 0%
     - Sequence: 3
5. **Click**: "Create BOM"

**✅ Expected Result**: BOM created with 3 components

---

### Step 5.2: Create Production Order

1. **Navigate**: Dashboard → **Production Management**
2. **Click**: "+ Create Production Order" button
3. **Select Finished Product**:
   - Type "FG-PUMP" in the search box
   - Select: FG-PUMP-001
4. **BOM should auto-load** below the item selection
5. **Select BOM**: Choose the BOM you just created
6. **Available UIDs will load** showing FIFO-sorted materials
7. **Enter Production Order Details**:
   ```
   Order Number: (Auto-generated, e.g., PO-2025-11-001)
   Quantity to Produce: 10 PCS
   Planned Start Date: Today
   Planned Completion Date: (3 days from today)
   Priority: High
   Production Line: Assembly Line 1
   Assigned To: Production Supervisor
   Notes: First production batch for testing
   ```
8. **Select UIDs for Components**:
   - For **Steel Plate** (need 20 KG total):
     - System shows available UIDs sorted by FIFO
     - Select the oldest UID(s) with sufficient quantity
   - For **Bearing** (need 20 PCS):
     - Select appropriate UID(s)
   - For **Motor** (need 10 PCS):
     - Select appropriate UID(s)
9. **Review Summary**:
   - Total components required
   - Selected UIDs
   - Estimated completion
10. **Click**: "Create Production Order"

**✅ Expected Result**: 
- Production order created
- Status: PLANNED
- Component UIDs assigned

---

### Step 5.3: Complete Production Assembly

1. **In Production Orders list**, find your order
2. **Click**: "Start Production" button
3. **Status changes to**: IN_PROGRESS
4. **After work is complete**, click: "Complete Production"
5. **Enter Completion Details**:
   ```
   Actual Quantity Produced: 10 PCS
   QC Status: PASSED
   Operator: Your Name
   Notes: All units passed quality check
   ```
6. **Click**: "Complete Assembly"

**✅ Expected Result**:
- Production order status: COMPLETED
- 10 new UIDs generated for finished pumps
- Component UIDs status changed to: CONSUMED
- Inventory updated automatically

---

## 🔍 PHASE 6: VERIFY PRODUCTION TRACEABILITY (10 minutes)

### Step 6.1: Check Finished Product UIDs

1. **Navigate**: Dashboard → **UID Tracking**
2. **Filter by**: Entity Type = "FG" (Finished Goods)
3. **You should see**: 10 new UIDs for pumps
4. **UIDs will look like**: `UID-SAIF-KOL-FG-000001-AA` through `UID-SAIF-KOL-FG-000010-JJ`

### Step 6.2: Trace Finished Product

1. **Click**: "🔍 Trace Product" button
2. **Enter**: One of the finished pump UIDs
3. **Click**: "Trace Product"
4. **You should now see**:
   - **Visual Timeline**:
     - CREATED event (production date)
     - ASSEMBLED event
     - QC_PASSED event
   - **Component Tree** (IMPORTANT - This is the key feature!):
     - Shows 3 components used:
       * Steel Plate UID with vendor (ABC Steel)
       * Bearing UID with vendor (XYZ Bearings)
       * Motor UID with vendor (PowerTech)
     - Each component is **clickable** - try clicking one!
   - **Quality Checkpoints**: QC PASSED
   - **Vendor Details**: Multiple vendors (one per component)

### Step 6.3: Drill Down Component Trace

1. **In Component Tree**, click "→ Trace this component" for **Steel Plate**
2. **New trace loads** showing:
   - Complete history of that steel plate
   - From which GRN it came
   - Original vendor (ABC Steel)
   - Batch number
   - When it was CONSUMED in production
3. **Click browser back** to return to finished product trace

**✅ Expected Result**: Complete forward and backward traceability working

---

## 📤 PHASE 7: SALES FLOW (15 minutes)

### Step 7.1: Create Sales Order

1. **Navigate**: Dashboard → **Sales**
2. **Click**: "+ Create Sales Order" button
3. **Enter Sales Order Details**:
   ```
   SO Number: (Auto-generated, e.g., SO-2025-11-001)
   Customer: CUST-001 (TechCorp Industries)
   Order Date: Today
   Required Date: (7 days from today)
   Payment Terms: Net 30 Days
   Shipping Address: (Customer's address - auto-filled)
   Notes: Initial order for trial installation
   ```
4. **Add Items**:
   - **Item**: FG-PUMP-001 (Industrial Water Pump)
   - **Quantity**: 5 PCS
   - **Unit Price**: 15,000 per PCS
   - **Total**: 75,000
5. **Click**: "Create Sales Order"

**✅ Expected Result**: Sales order created with 5 pumps

---

### Step 7.2: Process Delivery

1. **In Sales Orders list**, find your order
2. **Click**: "Process Delivery" button
3. **Select Specific UIDs** to ship (choose 5 pump UIDs)
4. **Enter Delivery Details**:
   ```
   Delivery Date: Today
   Invoice Number: INV-2025-11-001
   Vehicle Number: DL-02-CD-5678
   Driver Name: Ramesh Kumar
   Driver Phone: +91-9876543230
   Notes: Delivered to customer warehouse
   ```
5. **Click**: "Complete Delivery"

**✅ Expected Result**:
- Sales order status: DELIVERED
- Selected pump UIDs status changed to: SHIPPED
- Inventory reduced by 5

---

### Step 7.3: Verify Customer Trace

1. **Navigate**: Dashboard → **UID Tracking** → **🔍 Trace Product**
2. **Enter**: One of the shipped pump UIDs
3. **Click**: "Trace Product"
4. **You should now see**:
   - **Visual Timeline**:
     - CREATED
     - ASSEMBLED
     - QC_PASSED
     - **SHIPPED** ← New event!
   - **Component Tree**: Still shows all components used
   - **Customer Details** section now populated:
     - Customer Name: TechCorp Industries
     - Location: Mumbai, Maharashtra - 400001
     - Delivery Date: Today
     - Invoice Number: INV-2025-11-001

**✅ Expected Result**: Complete lifecycle from supplier → production → customer visible

---

## 📋 PHASE 8: QUALITY & DEFECT TRACKING (Optional - 10 minutes)

### Step 8.1: Report Defective Unit

1. **Navigate**: Dashboard → **Quality Management**
2. **Click**: "+ Report Defect" button
3. **Enter Defect Details**:
   ```
   UID: (Select one of the remaining pump UIDs not shipped)
   Defect Type: MANUFACTURING
   Defect Stage: FINAL_QC
   Severity: MINOR
   Description: Motor shaft slightly misaligned
   Detected By: Your Name
   Quarantine Location: QC Hold Area
   Disposition: REWORK
   ```
4. **Click**: "Report Defect"

**✅ Expected Result**: Defective unit recorded, UID status changed to QUARANTINED

---

### Step 8.2: Create Rework Order

1. **Navigate**: Dashboard → **Quality Management** → **Repair/Rework**
2. **Click**: "+ Create Rework Order" button
3. **Enter Details**:
   ```
   Repair Number: (Auto-generated)
   Repair Type: INTERNAL_REWORK
   UID: (Select the defective pump UID)
   Defect Description: Motor shaft misalignment
   Repair Action: Realign motor shaft and retest
   Priority: NORMAL
   Expected Completion: (Tomorrow)
   ```
4. **Click**: "Create Rework Order"

**✅ Expected Result**: Rework order created

---

### Step 8.3: Complete Rework

1. **In Rework Orders list**, find your order
2. **Click**: "Complete Rework"
3. **Enter Completion Details**:
   ```
   Parts Used: None (adjustment only)
   Labor Hours: 0.5
   Retest Status: PASSED
   Notes: Realignment completed, passed all tests
   ```
4. **Click**: "Complete"

**✅ Expected Result**: UID status changed back to AVAILABLE, ready for sale

---

## 🔍 PHASE 9: FINAL VERIFICATION (10 minutes)

### Step 9.1: Test Complete Traceability Chain

Pick one **finished pump UID that was shipped to customer**:

1. **Go to**: Trace Product page
2. **Enter the UID**
3. **Verify you can see**:
   - ✅ Complete timeline (6-8 events)
   - ✅ All 3 component materials
   - ✅ Each component clickable to trace back to supplier
   - ✅ Vendor details for each component
   - ✅ All quality checkpoints
   - ✅ Customer delivery details
4. **Click on a component** → **Trace it** → **See supplier details**
5. **Click browser back** → Back to finished product

**✅ This is the MOST IMPORTANT test - proves end-to-end traceability!**

---

### Step 9.2: Test Inventory Accuracy

1. **Navigate**: Dashboard → **Inventory**
2. **Verify Stock Levels**:
   - **RM-STEEL-001**: Should show remaining quantity (100 - 20 used = 80 KG)
   - **RM-BEARING-001**: Should show remaining (50 - 20 used = 30 PCS)
   - **RM-MOTOR-001**: Should show remaining (25 - 10 used = 15 PCS)
   - **FG-PUMP-001**: Should show remaining (10 produced - 5 shipped = 5 PCS)

**✅ Expected Result**: All quantities match calculations

---

### Step 9.3: Test Reports (if available)

1. **Navigate**: Dashboard → **Reports** (if module exists)
2. **Generate**:
   - Purchase Summary Report
   - Production Report
   - Sales Report
   - UID Traceability Report

**✅ Expected Result**: Reports show all transactions

---

## ✅ SUCCESS CRITERIA CHECKLIST

After completing all phases, verify:

- [ ] **Login** works smoothly
- [ ] **3 Vendors** created successfully
- [ ] **4 Items** created (3 RM + 1 FG)
- [ ] **2 Customers** created
- [ ] **PR → PO → GRN** flow completed
- [ ] **UIDs automatically generated** at GRN
- [ ] **BOM created** with 3 components
- [ ] **Production Order** completed
- [ ] **10 Finished Product UIDs** generated
- [ ] **Component UIDs marked CONSUMED**
- [ ] **Sales Order & Delivery** completed
- [ ] **5 Pumps shipped** to customer
- [ ] **Trace Product** shows complete timeline
- [ ] **Component Tree** displays all materials
- [ ] **Drill-down tracing** works (click component → see supplier)
- [ ] **Customer details** visible in trace
- [ ] **Inventory levels** accurate
- [ ] **All timestamps** recorded correctly

---

## 🚨 TROUBLESHOOTING

### Problem: UID not generating at GRN
**Solution**: 
- Check if QC Status is set to PASSED
- Verify Batch Number is entered
- Refresh page and check UID Tracking

### Problem: Production order can't select UIDs
**Solution**:
- Ensure GRN is completed
- Check UID status is AVAILABLE
- Verify sufficient quantity exists

### Problem: Trace Product shows incomplete data
**Solution**:
- This is normal for new data - some fields populate over time
- Vendor details require GRN linkage
- Customer details require delivery completion

### Problem: Can't find created records
**Solution**:
- Check filters on list pages
- Verify you're logged in as correct user
- Clear browser cache and refresh

---

## 📞 SUPPORT INFORMATION

**System URL**: http://13.205.17.214:3000  
**API URL**: http://13.205.17.214:4000

**Test Credentials**:
- Email: `admin@sakerp.com`
- Password: `Admin@123`

**Documentation**:
- Complete Feature Guide: `/docs/TRACE_PRODUCT_FEATURE.md`
- Quick Reference: `/docs/TRACE_PRODUCT_QUICK_REFERENCE.md`
- Architecture: `/docs/TRACE_PRODUCT_ARCHITECTURE.md`

**For Issues**:
- Take screenshots of error messages
- Note the exact step where issue occurred
- Check browser console (F12) for errors
- Contact development team with details

---

## 🎯 TESTING TIPS

1. **Take Your Time**: Don't rush through steps
2. **Verify Each Step**: Check expected results before moving forward
3. **Use Real-Like Data**: Enter realistic values
4. **Test Edge Cases**: Try different quantities, dates, etc.
5. **Document Issues**: Note any problems you encounter
6. **Test Multiple Scenarios**: Create 2-3 production orders to see patterns
7. **Check Mobile**: Test on mobile browser if available
8. **Test Different Users**: If you have multiple accounts, test with each

---

## 📊 EXAMPLE TEST RESULTS SHEET

Copy this table to track your testing:

| Phase | Module | Test Case | Status | Notes |
|-------|--------|-----------|--------|-------|
| 1 | Login | System Access | ⬜ Pass / ❌ Fail | |
| 2 | Purchase | Create Vendor | ⬜ Pass / ❌ Fail | |
| 2 | Inventory | Create Items | ⬜ Pass / ❌ Fail | |
| 2 | Sales | Create Customer | ⬜ Pass / ❌ Fail | |
| 3 | Purchase | PR → PO → GRN | ⬜ Pass / ❌ Fail | |
| 4 | UID | UID Generation | ⬜ Pass / ❌ Fail | |
| 4 | UID | Trace Product | ⬜ Pass / ❌ Fail | |
| 5 | Production | Create BOM | ⬜ Pass / ❌ Fail | |
| 5 | Production | Production Order | ⬜ Pass / ❌ Fail | |
| 5 | Production | Complete Assembly | ⬜ Pass / ❌ Fail | |
| 6 | UID | FG Traceability | ⬜ Pass / ❌ Fail | |
| 6 | UID | Component Drill-Down | ⬜ Pass / ❌ Fail | |
| 7 | Sales | Sales Order | ⬜ Pass / ❌ Fail | |
| 7 | Sales | Delivery | ⬜ Pass / ❌ Fail | |
| 8 | Quality | Defect Reporting | ⬜ Pass / ❌ Fail | |
| 9 | UID | End-to-End Trace | ⬜ Pass / ❌ Fail | |

---

**🎉 Thank you for testing SAK ERP!**

**Date of Testing**: _____________  
**Tested By**: _____________  
**Overall Result**: ⬜ PASS / ❌ FAIL  
**Recommendations**: _____________
