# Manufacturing ERP - Complete Testing Guide

**Version**: 1.0  
**Test Environment**: http://35.154.55.38  
**API Base URL**: http://35.154.55.38:4000  
**Date**: November 27, 2025  

---

## TEST EXECUTION INSTRUCTIONS

**For QC Team & Customers:**

1. **Access the System**: Open http://35.154.55.38 in your browser
2. **Test Each Module**: Follow test cases in sequence
3. **Document Results**: Mark each test as ✅ PASS or ❌ FAIL
4. **Report Issues**: Note any bugs, errors, or unexpected behavior
5. **Complete End-to-End Flows**: Test complete business processes

---

## PART 1: AUTHENTICATION & SETUP

### Test Case 1.1: User Registration
**Objective**: Verify new user can register successfully

**Steps**:
1. Navigate to http://35.154.55.38/register
2. Enter test user details:
   - Name: Test User
   - Email: testuser@saif.com
   - Password: Test@123
   - Confirm Password: Test@123
3. Click "Register"
4. Verify redirect to login page

**Expected Result**: User registered successfully, redirected to login

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 1.2: User Login
**Objective**: Verify registered user can login

**Steps**:
1. Navigate to http://35.154.55.38/login
2. Enter credentials:
   - Email: testuser@saif.com
   - Password: Test@123
3. Click "Login"
4. Verify redirect to dashboard

**Expected Result**: User logged in, dashboard displayed

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

## PART 2: PURCHASE MANAGEMENT MODULE

### Test Case 2.1: Create Vendor
**Objective**: Add new vendor to system

**Steps**:
1. Navigate to Purchase → Vendors
2. Click "+ New Vendor"
3. Fill vendor details:
   - Vendor Code: V001
   - Vendor Name: ABC Components Ltd
   - Contact Person: John Doe
   - Phone: 9876543210
   - Email: john@abc.com
   - Address: 123 Industrial Area
   - GST: 29ABCDE1234F1Z5
4. Click "Create Vendor"

**Expected Result**: Vendor created, appears in vendor list

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 2.2: Create Purchase Requisition
**Objective**: Create PR for material requirement

**Steps**:
1. Navigate to Purchase → Requisitions
2. Click "+ New Requisition"
3. Fill requisition details:
   - Requisition Number: PR-001
   - Required Date: [Today + 7 days]
   - Department: Production
   - Priority: MEDIUM
4. Add item (Note: Use actual item UUID from items table)
   - Item ID: [UUID from database]
   - Quantity: 100
   - Unit: PCS
5. Click "Create Requisition"

**Expected Result**: PR created with PENDING status

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 2.3: Create Purchase Order from PR
**Objective**: Convert PR to PO

**Steps**:
1. Navigate to Purchase → Orders
2. Click "+ New Order"
3. Fill PO details:
   - PO Number: PO-001
   - Vendor: Select ABC Components Ltd (V001)
   - Expected Delivery: [Today + 10 days]
   - Payment Terms: Net 30 days
4. Add items (quantity, unit price, tax)
5. Click "Create Order"

**Expected Result**: PO created with DRAFT status, total calculated correctly

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 2.4: Create GRN (Goods Receipt Note)
**Objective**: Receive material against PO, generate UIDs

**Steps**:
1. Navigate to Purchase → GRN
2. Click "+ New GRN"
3. Fill GRN details:
   - GRN Number: GRN-001
   - PO Number: Select PO-001
   - Received Date: [Today]
   - Invoice Number: INV-001
4. Add items with UIDs:
   - Item: [Select from PO]
   - Quantity Received: 100
   - Batch Number: BATCH-2025-001
   - UID: Will be auto-generated
5. Click "Create GRN"

**Expected Result**: 
- GRN created
- UIDs generated for each item
- UIDs appear in UID Tracking module
- Stock updated in Inventory

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

## PART 3: BOM & PRODUCTION MODULE

### Test Case 3.1: Create BOM
**Objective**: Define product structure with components

**Steps**:
1. Navigate to BOM Management
2. Click "+ New BOM"
3. Fill BOM details:
   - BOM Number: BOM-PROD-001
   - Product Name: Control Panel Assembly
   - Product Code: CP-001
   - Version: 1.0
4. Add components:
   - Component 1: PCB Board, Qty: 1, Unit: PCS
   - Component 2: Enclosure, Qty: 1, Unit: PCS
   - Component 3: Power Supply, Qty: 1, Unit: PCS
5. Click "Create BOM"

**Expected Result**: BOM created with all components listed

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 3.2: Create Production Order
**Objective**: Start production based on BOM

**Steps**:
1. Navigate to Production
2. Click "+ New Production Order"
3. Fill production order:
   - Order Number: PROD-001
   - BOM: Select BOM-PROD-001
   - Quantity: 10
   - Planned Start: [Today]
   - Planned End: [Today + 3 days]
4. Click "Create Production Order"

**Expected Result**: Production order created with PENDING status

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 3.3: Record Assembly
**Objective**: Track component usage and generate finished goods UID

**Steps**:
1. Open Production Order PROD-001
2. Click "Record Assembly"
3. Enter assembly details:
   - Finished Goods Quantity: 10
   - Assembly Date: [Today]
4. Add component UIDs used (from GRN):
   - Component: PCB Board, UID: [From GRN], Qty: 10
   - Component: Enclosure, UID: [From GRN], Qty: 10
   - Component: Power Supply, UID: [From GRN], Qty: 10
5. Click "Complete Assembly"

**Expected Result**:
- Finished goods UIDs generated (10 UIDs)
- Component UIDs marked as consumed
- Parent-child UID relationship created
- Stock updated (components deducted, finished goods added)

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

## PART 4: QUALITY INSPECTION MODULE

### Test Case 4.1: Incoming Quality Check (IQC)
**Objective**: Inspect materials received via GRN

**Steps**:
1. Navigate to Quality & Inspection → Inspections
2. Click "+ New Inspection"
3. Fill inspection details:
   - Inspection Type: INCOMING
   - Reference Type: GRN
   - Reference ID: [GRN UUID]
   - Item: [Select item from GRN]
   - UID: [Select UID from GRN]
   - Quantity Inspected: 100
   - Inspector: [Inspector UUID]
   - Date: [Today]
4. Click "Create Inspection"

**Expected Result**: Inspection record created with PENDING status

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 4.2: Complete Inspection (Pass)
**Objective**: Mark inspection as passed

**Steps**:
1. Find inspection record from Test Case 4.1
2. Click "Complete" button
3. Fill completion form:
   - Status: PASSED
   - Quantity Accepted: 95
   - Quantity Rejected: 5
   - Quantity On Hold: 0
   - Remarks: Minor scratches on 5 pieces
4. Click "Complete Inspection"

**Expected Result**:
- Inspection status changed to PASSED
- Defect rate calculated (5%)
- No NCR generated

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 4.3: Complete Inspection (Fail) with NCR
**Objective**: Fail inspection and auto-generate NCR

**Steps**:
1. Create another inspection (repeat Test Case 4.1)
2. Click "Complete" button
3. Fill completion form:
   - Status: FAILED
   - Quantity Accepted: 0
   - Quantity Rejected: 100
   - Generate NCR: ✓ (checked)
   - NCR Description: Material does not meet specifications
4. Click "Complete Inspection"

**Expected Result**:
- Inspection status changed to FAILED
- Defect rate calculated (100%)
- NCR auto-generated with OPEN status

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 4.4: NCR Management
**Objective**: Process Non-Conformance Report

**Steps**:
1. Navigate to Quality & Inspection → NCR
2. Find auto-generated NCR
3. Update NCR:
   - Root Cause: Poor manufacturing process at vendor
   - Containment Action: Quarantine entire batch
   - Corrective Action: Request vendor to improve process
   - Preventive Action: Add incoming inspection checkpoint
4. Verify NCR appears in NCR list

**Expected Result**: NCR details saved, visible in NCR tab

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 4.5: Vendor Quality Rating
**Objective**: Calculate vendor quality score

**Steps**:
1. Navigate to Quality & Inspection → Vendor Ratings
2. Find vendor ABC Components Ltd
3. Verify quality metrics:
   - Total Inspections
   - Passed Inspections
   - Pass Rate %
   - Defect Rate (PPM)
   - NCR Count
   - Quality Score (0-100)
   - Quality Grade (A+ to F)

**Expected Result**: 
- Vendor card displays with grade badge
- Metrics calculated correctly based on weighted algorithm
- Grade reflects quality performance

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

## PART 5: INVENTORY/STORES MODULE

### Test Case 5.1: View Stock Levels
**Objective**: Check current inventory

**Steps**:
1. Navigate to Inventory/Stores
2. View stock table
3. Verify columns:
   - Item Name
   - Item Code
   - Location
   - Available Quantity
   - Reserved Quantity
   - Total Stock

**Expected Result**: Stock reflects GRN receipts and production consumption

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 5.2: Stock Movement
**Objective**: Transfer stock between locations

**Steps**:
1. Navigate to Inventory → Stock Movements (if tab exists)
2. Create transfer:
   - Item: Control Panel Assembly
   - From Location: Production
   - To Location: Finished Goods Warehouse
   - Quantity: 10
   - Movement Type: TRANSFER
3. Submit movement

**Expected Result**: 
- Stock deducted from source location
- Stock added to destination location
- Movement logged in system

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

## PART 6: SALES & DISPATCH MODULE

### Test Case 6.1: Create Customer
**Objective**: Add customer to system

**Steps**:
1. Navigate to Sales → Customers tab
2. Click "+ New Customer"
3. Fill customer details:
   - Customer Code: C001
   - Customer Name: XYZ Industries
   - Contact Person: Jane Smith
   - Phone: 9988776655
   - Email: jane@xyz.com
   - Billing Address: 456 Business Park
   - Shipping Address: Same as billing
   - GST: 29XYZIN9876G1Z3
4. Click "Create Customer"

**Expected Result**: Customer created, appears in customer list

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 6.2: Create Quotation
**Objective**: Generate sales quotation

**Steps**:
1. Navigate to Sales → Quotations tab
2. Click "+ New Quotation"
3. Fill quotation:
   - Quotation Number: QT-001
   - Customer: XYZ Industries (C001)
   - Valid Until: [Today + 30 days]
4. Add items:
   - Item: Control Panel Assembly
   - Quantity: 5
   - Unit Price: 15000
   - Tax: 18%
5. Click "Create Quotation"

**Expected Result**: 
- Quotation created
- Total calculated correctly (subtotal + tax)
- Status: DRAFT

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 6.3: Convert Quotation to Sales Order
**Objective**: Convert accepted quotation to order

**Steps**:
1. Navigate to Sales → Orders tab
2. Click "+ New Order"
3. Fill sales order:
   - Order Number: SO-001
   - Customer: XYZ Industries
   - Order Date: [Today]
   - Delivery Date: [Today + 7 days]
   - Reference Quotation: QT-001
4. Add items (same as quotation)
5. Click "Create Sales Order"

**Expected Result**: 
- Sales order created
- Status: CONFIRMED
- Items match quotation

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 6.4: Create Dispatch Order
**Objective**: Ship products to customer with UID tracking

**Steps**:
1. Navigate to Sales → Dispatch tab
2. Click "+ New Dispatch"
3. Fill dispatch details:
   - Dispatch Number: DISP-001
   - Sales Order: SO-001
   - Customer: XYZ Industries
   - Dispatch Date: [Today]
   - Transport Details: Truck ABC-1234
4. Add items with UIDs:
   - Item: Control Panel Assembly
   - Quantity: 5
   - UIDs: [Select 5 UIDs from finished goods]
5. Click "Create Dispatch"

**Expected Result**:
- Dispatch created
- UIDs linked to dispatch
- Stock deducted from finished goods
- Warranties auto-generated for each UID

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 6.5: Verify Warranty Generation
**Objective**: Confirm warranty created on dispatch

**Steps**:
1. Navigate to Sales → Warranties tab
2. Verify warranties for DISP-001
3. Check warranty details:
   - UID linked
   - Customer linked
   - Start Date (dispatch date)
   - End Date (start date + validity period)
   - Status: ACTIVE

**Expected Result**: 
- 5 warranties created (one per UID)
- All details populated correctly
- Status: ACTIVE

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

## PART 7: SERVICE & WARRANTY MODULE

### Test Case 7.1: Create Service Ticket
**Objective**: Log customer complaint

**Steps**:
1. Navigate to Service & Warranty → Service Tickets tab
2. Click "+ New Service Ticket"
3. Fill ticket details:
   - Customer: XYZ Industries
   - UID: [Select UID from dispatched products]
   - Service Type: WARRANTY
   - Priority: HIGH
   - Complaint: Product not powering on
   - Reported By: Jane Smith
   - Contact: 9988776655
4. Click "Create Ticket"

**Expected Result**:
- Ticket created
- Warranty auto-validated by UID
- is_under_warranty: TRUE
- warranty_valid_until populated
- Status: OPEN

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 7.2: Warranty Check
**Objective**: Validate warranty status by UID

**Steps**:
1. Navigate to Service & Warranty → Warranty Check tab
2. Enter UID: [UID from Test Case 7.1]
3. Click "Check Warranty"
4. Verify display:
   - ✓ Green checkmark if under warranty
   - ✗ Red X if warranty expired
   - Warranty details (start, end, validity, customer)

**Expected Result**: 
- Warranty status displayed correctly
- Visual indicator (green/red)
- All warranty details shown

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 7.3: Assign Technician
**Objective**: Assign service engineer to ticket

**Steps**:
1. Create technician first:
   - Navigate to Service & Warranty → Technicians tab
   - Add technician: T001 - Rajesh Kumar
2. Open service ticket from Test Case 7.1
3. Assign technician (Note: May need backend API call)
4. Set scheduled dates

**Expected Result**: 
- Technician assigned to ticket
- Assignment visible in service assignments
- Status: ASSIGNED

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

## PART 8: HR & PAYROLL MODULE

### Test Case 8.1: Create Employee
**Objective**: Add employee to HR system

**Steps**:
1. Navigate to HR & Payroll → Employees tab
2. Click "+ New Employee"
3. Fill employee details:
   - Employee Code: EMP001
   - Employee Name: Rajesh Kumar
   - Designation: Service Engineer
   - Department: Service
   - Date of Joining: 2025-01-01
   - Date of Birth: 1990-05-15
   - Contact: 9876543210
   - Email: rajesh@saif.com
   - Biometric ID: BIO001
4. Click "Create Employee"

**Expected Result**: Employee created, appears in employee list

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 8.2: Record Attendance
**Objective**: Track employee attendance

**Steps**:
1. Navigate to HR & Payroll → Attendance tab
2. Click "+ Record Attendance"
3. Fill attendance:
   - Employee: Rajesh Kumar (EMP001)
   - Date: [Today]
   - Check In: 09:00
   - Check Out: 18:00
   - Status: PRESENT
4. Click "Record Attendance"

**Expected Result**: Attendance recorded, visible in attendance table

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 8.3: Apply Leave
**Objective**: Submit leave request

**Steps**:
1. Navigate to HR & Payroll → Leave Requests tab
2. Click "+ Apply Leave"
3. Fill leave request:
   - Employee: Rajesh Kumar
   - Leave Type: CASUAL
   - Start Date: [Tomorrow]
   - End Date: [Tomorrow + 2 days]
   - Total Days: 3
   - Reason: Family function
4. Click "Submit Leave Request"

**Expected Result**: 
- Leave request created
- Status: PENDING
- Visible in leave requests table

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

### Test Case 8.4: Approve Leave
**Objective**: Manager approves leave

**Steps**:
1. Find leave request from Test Case 8.3
2. Click "Approve" button
3. Verify status change

**Expected Result**: 
- Status changed to APPROVED
- Approved timestamp recorded

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

## PART 9: UID TRACEABILITY

### Test Case 9.1: Complete UID Lifecycle Verification
**Objective**: Trace UID from vendor to customer to service

**Steps**:
1. Navigate to UID Tracking
2. Search for any UID from finished goods
3. Verify UID registry entry shows:
   - UID number
   - QR code
   - Item details
   - Current location
   - Current status
4. Check UID movements:
   - Receipt at GRN
   - Movement to production
   - Component linkage (parent-child)
   - Movement to finished goods
   - Dispatch to customer
5. Check UID inspections:
   - Incoming inspection link
   - In-process inspection link
   - Final inspection link
6. Check service history:
   - Service tickets linked to UID
   - Parts replacement history

**Expected Result**: 
- Complete UID history visible
- All lifecycle stages tracked
- Parent-child relationships shown
- QR code scannable

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Notes**: _______________________________________________

---

## PART 10: END-TO-END BUSINESS PROCESS

### Test Case 10.1: Complete Manufacturing Cycle
**Objective**: Test entire process from purchase to service

**Complete Flow**:
1. ✅ Create Vendor (Test Case 2.1)
2. ✅ Create Purchase Requisition (Test Case 2.2)
3. ✅ Create Purchase Order (Test Case 2.3)
4. ✅ Create GRN with UID generation (Test Case 2.4)
5. ✅ Perform IQC inspection (Test Case 4.1, 4.2)
6. ✅ Create BOM (Test Case 3.1)
7. ✅ Create Production Order (Test Case 3.2)
8. ✅ Record Assembly with component UIDs (Test Case 3.3)
9. ✅ Perform final inspection (Test Case 4.1 for finished goods)
10. ✅ Create Customer (Test Case 6.1)
11. ✅ Create Quotation (Test Case 6.2)
12. ✅ Create Sales Order (Test Case 6.3)
13. ✅ Create Dispatch with warranty (Test Case 6.4, 6.5)
14. ✅ Create Service Ticket (Test Case 7.1)
15. ✅ Validate Warranty (Test Case 7.2)
16. ✅ Verify complete UID traceability (Test Case 9.1)

**Expected Result**: All steps complete successfully with data flowing correctly between modules

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail  
**Overall Time**: ___________ minutes  
**Notes**: _______________________________________________

---

## TEST SUMMARY

**Total Test Cases**: 30+  
**Passed**: _______  
**Failed**: _______  
**Not Tested**: _______  

**Critical Bugs Found**: _______  
**Medium Bugs Found**: _______  
**Minor Issues Found**: _______  

**Overall Assessment**: 
- ⬜ Ready for Production
- ⬜ Needs Minor Fixes
- ⬜ Needs Major Fixes
- ⬜ Not Ready

**Tester Name**: _______________________________________________  
**Test Date**: _______________________________________________  
**Sign**: _______________________________________________

---

## KNOWN LIMITATIONS & NOTES

1. **API UUIDs**: Some test cases require actual UUIDs from database. Use Supabase dashboard to get these.
2. **Data Prerequisites**: Some modules depend on data from previous modules.
3. **Sequential Testing**: Follow test cases in order for best results.
4. **Browser**: Tested on Chrome/Edge. Other browsers not yet validated.

**END OF TEST DOCUMENT**
