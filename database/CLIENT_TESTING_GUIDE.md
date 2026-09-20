# SAK ERP System - Complete Testing Guide

## 📋 Overview
This guide will walk you through testing all major modules of the SAK Manufacturing ERP system in a logical sequence that mirrors real business operations.

## ⚠️ Before Starting
1. Ensure the system is clean - all test data has been removed
2. You have admin access to the system
3. Backend server is running on port 4000
4. Frontend is accessible at http://13.205.17.214:3000

---

## 🔄 PHASE 1: MASTER DATA SETUP (Foundation)

### Step 1: Create Plants/Warehouses
**Path:** Master Data → Plants

**Test Data:**
- Plant Code: MAIN-001
- Plant Name: Main Manufacturing Plant
- Location: Mumbai, India
- Type: Manufacturing
- Status: Active

**What to verify:**
✓ Plant is created successfully
✓ Plant appears in dropdown lists throughout the system

---

### Step 2: Create Vendors (Suppliers)
**Path:** Master Data → Vendors

**Test Data:**
Create 2-3 vendors:

**Vendor 1:**
- Vendor Code: V001
- Vendor Name: Steel Suppliers Ltd
- Contact Person: John Smith
- Email: john@steelsuppliers.com
- Phone: +91-9876543210
- Address: Industrial Area, Mumbai
- GST Number: 27XXXXX1234X1Z5
- Payment Terms: Net 30 days
- Status: Active

**Vendor 2:**
- Vendor Code: V002
- Vendor Name: Electronics Components Inc
- Contact Person: Sarah Johnson
- Email: sarah@electronics.com
- Status: Active

**What to verify:**
✓ Vendors are saved with all details
✓ Can search and filter vendors
✓ Vendors appear in Purchase Order creation

---

### Step 3: Create Customers
**Path:** Master Data → Customers

**Test Data:**
Create 2-3 customers:

**Customer 1:**
- Customer Code: C001
- Customer Name: Tech Manufacturing Co
- Contact Person: Mike Wilson
- Email: mike@techmanufacturing.com
- Phone: +91-9876543211
- Billing Address: Sector 5, Bangalore
- Shipping Address: (same as billing)
- GST Number: 29XXXXX5678X1Z6
- Credit Limit: 500000
- Payment Terms: Net 45 days
- Status: Active

**Customer 2:**
- Customer Code: C002
- Customer Name: Industrial Solutions Pvt Ltd
- Status: Active

**What to verify:**
✓ Customers are saved with complete information
✓ Can view customer list and details
✓ Customers appear in Sales Order creation

---

### Step 4: Create Items (Products & Materials)
**Path:** Master Data → Items

**Test Raw Material:**
- Item Code: RM-001
- Item Name: Steel Sheet 304
- Description: Stainless Steel Sheet - Grade 304
- Category: Raw Material
- Unit of Measure: KG
- Type: Purchase
- Status: Active
- Reorder Level: 100
- Min Stock: 50
- Max Stock: 1000

**Test Finished Product:**
- Item Code: FG-001
- Item Name: Control Panel Assembly
- Description: Electronic Control Panel - Model CP100
- Category: Finished Goods
- Unit of Measure: PCS
- Type: Manufactured
- Status: Active
- Reorder Level: 10
- Min Stock: 5
- Max Stock: 50

**Test Component:**
- Item Code: COMP-001
- Item Name: Circuit Board PCB-100
- Category: Component
- Unit of Measure: PCS
- Type: Purchase
- Status: Active

**What to verify:**
✓ Items are created with correct categories
✓ Can search items by code/name
✓ Items appear in relevant transactions (PO, SO, BOM)

---

## 🏭 PHASE 2: BILL OF MATERIALS (BOM)

### Step 5: Create BOM for Finished Product
**Path:** Production → BOM → Create BOM

**Test Data:**
- Product: FG-001 (Control Panel Assembly)
- BOM Code: BOM-CP100
- Version: 1.0
- Status: Active
- Effective Date: Today

**BOM Items (Components):**
1. COMP-001 (Circuit Board) - Quantity: 1 PCS
2. RM-001 (Steel Sheet) - Quantity: 2 KG

**What to verify:**
✓ BOM is created and linked to the product
✓ Can view BOM structure
✓ BOM shows correct component quantities
✓ Can calculate total material cost

---

## 📦 PHASE 3: PURCHASE CYCLE

### Step 6: Create Purchase Requisition (PR)
**Path:** Purchase → Purchase Requisition → Create PR

**Test Data:**
- PR Number: Auto-generated
- Request Date: Today
- Required By Date: 7 days from today
- Requested By: Current User
- Plant: MAIN-001
- Department: Production

**Line Items:**
1. Item: RM-001 (Steel Sheet)
   - Quantity: 500 KG
   - Required Date: 7 days from today
2. Item: COMP-001 (Circuit Board)
   - Quantity: 50 PCS
   - Required Date: 7 days from today

**What to verify:**
✓ PR is created with status "Pending"
✓ Can view PR list
✓ PR shows correct items and quantities
✓ Can edit PR before approval
✓ Approval workflow works (if configured)

---

### Step 7: Convert PR to Purchase Order (PO)
**Path:** Purchase → Purchase Orders → Create PO (or convert from PR)

**Test Data:**
- PO Number: Auto-generated
- Order Date: Today
- Delivery Date: 10 days from today
- Vendor: V001 (Steel Suppliers Ltd)
- Plant: MAIN-001
- Payment Terms: Net 30 days
- Reference: Link to PR from Step 6

**Line Items:**
1. Item: RM-001 (Steel Sheet)
   - Quantity: 500 KG
   - Unit Price: 150
   - Tax: 18% GST
   - Total: Calculate automatically
2. Item: COMP-001 (Circuit Board)
   - Quantity: 50 PCS
   - Unit Price: 200
   - Tax: 18% GST

**What to verify:**
✓ PO is created with status "Draft" or "Pending"
✓ Can view PO in list
✓ Totals are calculated correctly (Subtotal + Tax)
✓ Can print/export PO
✓ Can send PO to vendor (email if configured)
✓ Can approve PO (status changes to "Approved")

---

### Step 8: Create Goods Receipt Note (GRN)
**Path:** Purchase → GRN → Create GRN

**Test Data:**
- GRN Number: Auto-generated
- GRN Date: Today
- PO Reference: Select PO from Step 7
- Vendor: V001 (auto-filled from PO)
- Plant: MAIN-001
- Delivery Note Number: DN-2025-001
- Vehicle Number: MH-01-AB-1234

**Line Items:** (Auto-filled from PO)
1. Item: RM-001 (Steel Sheet)
   - Ordered Quantity: 500 KG
   - Received Quantity: 500 KG (or enter actual received)
   - Accepted Quantity: 490 KG (10 KG rejected for quality)
   - Rejected Quantity: 10 KG
   - Rejection Reason: Surface damage
2. Item: COMP-001 (Circuit Board)
   - Ordered: 50 PCS
   - Received: 50 PCS
   - Accepted: 50 PCS

**What to verify:**
✓ GRN is created and linked to PO
✓ Inventory increases by accepted quantity
✓ PO status updates (Partially/Fully Received)
✓ Can view stock levels after GRN
✓ Rejected items are tracked separately

---

### Step 9: Generate UID Labels for Received Items
**Path:** UID Management → Generate UIDs

**Test Data:**
- GRN Reference: Select GRN from Step 8
- Item: RM-001 (Steel Sheet)
- Quantity to Label: 490 KG
- UID Format: Auto-generate unique IDs

**Generate UIDs:**
- Batch Size: 50 KG per label (10 labels total)
- Print labels with QR codes

**What to verify:**
✓ UIDs are generated for each batch
✓ UIDs are linked to GRN and Item
✓ Can print UID labels with QR codes
✓ Each UID shows: Item Code, Quantity, GRN Number, Date
✓ Can scan QR code to view UID details

---

## ✅ PHASE 4: QUALITY INSPECTION

### Step 10: Create Quality Inspection
**Path:** Quality → Inspections → Create Inspection

**Test Data:**
- Inspection Number: Auto-generated
- Inspection Date: Today
- Inspector: Current User
- Reference Type: GRN
- Reference Number: GRN from Step 8
- Item: RM-001 (Steel Sheet)
- Batch/UID: Select from available UIDs
- Quantity Inspected: 50 KG

**Inspection Results:**
- Visual Inspection: Pass
- Dimensional Check: Pass
- Surface Finish: Pass
- Overall Result: Approved
- Remarks: Material meets specifications

**What to verify:**
✓ Inspection record is created
✓ Can link inspection to GRN
✓ Can attach photos/documents
✓ Inspection results affect stock status
✓ Can view inspection history for an item

---

### Step 11: Handle Defective Units (NCR - Non-Conformance Report)
**Path:** Quality → NCR → Create NCR

**Test Data:**
- NCR Number: Auto-generated
- NCR Date: Today
- Reported By: Current User
- Inspection Reference: Link to inspection from Step 10
- Item: RM-001
- Quantity: 10 KG (rejected items from GRN)
- Defect Type: Surface Damage
- Severity: Minor
- Description: Scratches and dents on surface

**Corrective Action:**
- Action: Return to Vendor (RTV)
- Responsible Person: Purchase Manager
- Target Date: 3 days
- Status: Open

**What to verify:**
✓ NCR is created and tracked
✓ Can link NCR to inspection/GRN
✓ Can assign corrective actions
✓ Can update NCR status
✓ Can generate RTV document from NCR

---

## 💰 PHASE 5: SALES CYCLE

### Step 12: Create Sales Quotation
**Path:** Sales → Quotations → Create Quotation

**Test Data:**
- Quotation Number: Auto-generated
- Quotation Date: Today
- Valid Until: 30 days from today
- Customer: C001 (Tech Manufacturing Co)
- Sales Person: Current User
- Payment Terms: Net 45 days
- Delivery Terms: Ex-Works

**Line Items:**
1. Item: FG-001 (Control Panel Assembly)
   - Quantity: 20 PCS
   - Unit Price: 15000
   - Discount: 5%
   - Tax: 18% GST
   - Total: Calculate automatically

**What to verify:**
✓ Quotation is created with status "Draft"
✓ Pricing and totals are calculated correctly
✓ Can print/export quotation
✓ Can send quotation to customer (email if configured)
✓ Can convert quotation to Sales Order

---

### Step 13: Convert Quotation to Sales Order (SO)
**Path:** Sales → Sales Orders → Create SO (or convert from quotation)

**Test Data:**
- SO Number: Auto-generated
- Order Date: Today
- Delivery Date: 15 days from today
- Customer: C001 (auto-filled)
- Customer PO Number: CPO-2025-001
- Reference: Link to quotation from Step 12
- Payment Terms: Net 45 days
- Shipping Address: Customer's address

**Line Items:** (Auto-filled from quotation)
1. Item: FG-001 (Control Panel Assembly)
   - Quantity: 20 PCS
   - Unit Price: 15000
   - Discount: 5%
   - Tax: 18% GST

**What to verify:**
✓ SO is created from quotation
✓ All details are transferred correctly
✓ SO status is "Confirmed"
✓ Can view SO in list
✓ Can print Sales Order acknowledgment
✓ System checks stock availability

---

## 🏭 PHASE 6: PRODUCTION CYCLE

### Step 14: Create Production Order
**Path:** Production → Production Orders → Create Production Order

**Test Data:**
- Production Order Number: Auto-generated
- Order Date: Today
- Required Date: 10 days from today
- Item to Produce: FG-001 (Control Panel Assembly)
- Quantity: 20 PCS
- Reference: Link to SO from Step 13
- BOM: BOM-CP100 (auto-filled)
- Plant: MAIN-001
- Priority: High

**Material Requirements:** (Auto-calculated from BOM)
- COMP-001: 20 PCS
- RM-001: 40 KG

**What to verify:**
✓ Production Order is created
✓ BOM is linked and materials calculated
✓ Can view material availability
✓ System shows material shortage (if any)
✓ Production Order status is "Released"

---

### Step 15: Create Production Routing (Work Stations)
**Path:** Production → Routing → Create Routing

**Test Data:**
For FG-001 (Control Panel Assembly):

**Operation 1:**
- Station: Cutting Station
- Operation: Cut Steel Sheets
- Sequence: 10
- Setup Time: 15 minutes
- Run Time: 5 minutes per unit
- Workers Required: 1

**Operation 2:**
- Station: Assembly Station
- Operation: Mount Circuit Board
- Sequence: 20
- Setup Time: 10 minutes
- Run Time: 10 minutes per unit
- Workers Required: 2

**Operation 3:**
- Station: Testing Station
- Operation: Quality Testing
- Sequence: 30
- Run Time: 15 minutes per unit
- Workers Required: 1

**What to verify:**
✓ Routing is created with all operations
✓ Operations are in correct sequence
✓ Time calculations are correct
✓ Can link routing to production order

---

### Step 16: Issue Materials to Production
**Path:** Inventory → Stock Movements → Issue to Production

**Test Data:**
- Transaction Type: Issue to Production
- Issue Date: Today
- Production Order: Select PO from Step 14
- From Plant/Location: MAIN-001 / Raw Material Store
- To Location: Production Floor

**Items to Issue:**
1. COMP-001 (Circuit Board)
   - Required: 20 PCS
   - Available: Check current stock
   - Issue Quantity: 20 PCS
   - UID/Batch: Select available UIDs
2. RM-001 (Steel Sheet)
   - Required: 40 KG
   - Issue Quantity: 40 KG
   - UID/Batch: Select available UIDs

**What to verify:**
✓ Materials are issued against production order
✓ Stock reduces from raw material store
✓ Work-in-progress inventory increases
✓ Can track material consumption
✓ UID tracking shows material movement

---

### Step 17: Record Production Progress (Station Completions)
**Path:** Production → Station Completions → Record Completion

**Complete Operation 1 (Cutting):**
- Production Order: PO from Step 14
- Work Station: Cutting Station
- Operation: Cut Steel Sheets
- Completed Quantity: 20 PCS
- Completion Date: Today
- Operator: Current User
- Actual Time: 2 hours
- Status: Completed

**Complete Operation 2 (Assembly):**
- Work Station: Assembly Station
- Operation: Mount Circuit Board
- Completed Quantity: 20 PCS
- Completion Date: Today + 1 day
- Status: Completed

**Complete Operation 3 (Testing):**
- Work Station: Testing Station
- Operation: Quality Testing
- Completed Quantity: 20 PCS (18 passed, 2 failed)
- Status: Completed

**What to verify:**
✓ Completions are recorded for each station
✓ Production progress is visible
✓ Time tracking is accurate
✓ Can view completion history
✓ Production order status updates as operations complete

---

### Step 18: Handle Production Defects
**Path:** Production → Defective Units → Record Defects

**Test Data:**
- Production Order: PO from Step 14
- Item: FG-001
- Defective Quantity: 2 PCS
- Defect Type: Assembly defect
- Station: Assembly Station
- Description: Circuit board not properly mounted
- Action: Rework
- Responsible: Production Supervisor

**What to verify:**
✓ Defects are recorded against production order
✓ Can track defect reasons and locations
✓ Rework orders can be created
✓ Good quantity vs scrap quantity is tracked
✓ Reports show defect analysis

---

### Step 19: Complete Production and Receive Finished Goods
**Path:** Production → Production Orders → Complete Production

**Test Data:**
- Production Order: PO from Step 14
- Completion Date: Today
- Produced Quantity: 18 PCS (20 started - 2 defective)
- Scrap Quantity: 2 PCS
- Completion Type: Final
- Destination: Finished Goods Store

**Generate UIDs for Finished Products:**
- Item: FG-001
- Quantity: 18 PCS
- Generate individual UIDs for each unit
- Print UID labels with QR codes

**What to verify:**
✓ Production order status changes to "Completed"
✓ Finished goods inventory increases by 18 PCS
✓ WIP inventory clears
✓ UIDs are generated for all finished products
✓ Material consumption is recorded
✓ Can view production cost summary

---

## 📤 PHASE 7: DELIVERY & INVOICING

### Step 20: Create Delivery Note
**Path:** Sales → Delivery → Create Delivery Note

**Test Data:**
- Delivery Note Number: Auto-generated
- Delivery Date: Today
- Sales Order: SO from Step 13
- Customer: C001 (auto-filled)
- Shipping Address: Customer's shipping address
- Vehicle Number: MH-02-CD-5678
- Driver Name: Ramesh Kumar
- Driver Contact: +91-9876543220

**Items to Deliver:**
1. Item: FG-001
   - Ordered Quantity: 20 PCS
   - Available: 18 PCS
   - Delivery Quantity: 18 PCS
   - Select UIDs: Choose 18 finished product UIDs

**What to verify:**
✓ Delivery note is created
✓ UIDs are allocated to delivery
✓ Stock reduces from finished goods
✓ Can print delivery challan
✓ Customer can sign delivery acknowledgment
✓ Sales order status updates (Partially/Fully Delivered)

---

### Step 21: Create Sales Invoice
**Path:** Sales → Invoices → Create Invoice

**Test Data:**
- Invoice Number: Auto-generated
- Invoice Date: Today
- Due Date: 45 days from today (as per payment terms)
- Sales Order: SO from Step 13
- Delivery Note: DN from Step 20
- Customer: C001
- Billing Address: Customer's billing address

**Invoice Items:** (Auto-filled from delivery)
1. Item: FG-001
   - Quantity: 18 PCS
   - Unit Price: 15000
   - Discount: 5%
   - Taxable Amount: Calculate
   - CGST 9%: Calculate
   - SGST 9%: Calculate
   - Total: Calculate

**Invoice Summary:**
- Subtotal: 270000
- Discount: 13500
- Taxable Amount: 256500
- CGST (9%): 23085
- SGST (9%): 23085
- Total Invoice Value: 302670

**What to verify:**
✓ Invoice is generated with correct calculations
✓ Tax breakup is shown correctly
✓ Can print invoice (Tax invoice format)
✓ Can email invoice to customer
✓ Invoice is recorded in accounts receivable
✓ Payment due date is tracked

---

## 🔄 PHASE 8: SERVICE & AFTER-SALES

### Step 22: Create Service Request
**Path:** Service → Service Requests → Create Request

**Test Data:**
- Request Number: Auto-generated
- Request Date: Today + 5 days
- Customer: C001 (Tech Manufacturing Co)
- Product: FG-001 (Control Panel Assembly)
- UID/Serial Number: Select one of the delivered UIDs
- Issue Type: Warranty Service
- Priority: High
- Description: Unit not powering on correctly
- Reported By: Customer contact person

**What to verify:**
✓ Service request is created
✓ Can link to customer and product UID
✓ Request appears in service queue
✓ Can assign to service technician
✓ Can track request status

---

### Step 23: Process Service Request
**Path:** Service → Service Requests → Update Request

**Service Details:**
- Assigned To: Service Technician
- Schedule Date: Today + 6 days
- Visit Type: On-site
- Diagnosis: Faulty power supply component
- Action Taken: Replaced power supply module
- Parts Used: (if any replacement parts)
- Service Completion Date: Today + 7 days
- Status: Completed
- Customer Feedback: Satisfied

**What to verify:**
✓ Service request can be updated with diagnosis
✓ Can record actions taken
✓ Can track parts used in service
✓ Service history is maintained for the UID
✓ Can generate service report
✓ Request status changes to "Closed"

---

### Step 24: Warranty Management
**Path:** Service → Warranties → Create Warranty

**Test Data:**
- Product: FG-001 (Control Panel Assembly)
- UID/Serial Number: Select one of the delivered UIDs
- Customer: C001 (Tech Manufacturing Co)
- Sales Order Reference: SO from Step 13
- Warranty Type: Standard Manufacturer Warranty
- Warranty Period: 12 months
- Start Date: Delivery Date (from Step 20)
- End Date: Auto-calculate (Start Date + 12 months)
- Coverage: Parts and Labor
- Terms & Conditions: Standard warranty terms

**What to verify:**
✓ Warranty is created and linked to product UID
✓ Warranty period is calculated correctly
✓ Can view warranty status (Active/Expired)
✓ Can search warranties by customer/product
✓ System shows warranty details when service request is created

---

### Step 25: Create Warranty Claim
**Path:** Service → Warranty Claims → Create Claim

**Test Data:**
- Claim Number: Auto-generated
- Claim Date: Today + 10 days (within warranty period)
- Customer: C001 (auto-filled from warranty)
- Product UID: Select warranted product
- Warranty Reference: Link to warranty from Step 24
- Issue Description: Component failure within warranty period
- Claim Type: Repair
- Priority: Medium
- Reported By: Customer contact person

**Claim Processing:**
- Claim Status: Submitted
- Review Date: Today + 11 days
- Approved By: Service Manager
- Approval Status: Approved
- Resolution: Replace faulty component under warranty
- Service Ticket: Create linked service ticket
- Completion Date: Today + 13 days
- Final Status: Closed - Approved

**What to verify:**
✓ Warranty claim is created and linked to warranty
✓ System validates warranty is still active
✓ Claim approval workflow works
✓ Can track claim status through lifecycle
✓ Service ticket is automatically created from claim
✓ Claim history is maintained
✓ Can generate warranty claim report

---

## 📦 PHASE 9: DEMO STOCK MANAGEMENT

### Step 26: Issue Demo Stock
**Path:** Inventory → Demo Management → Issue Demo Stock

**Test Data:**
- Demo ID: DEMO-2025-001
- Issue Date: Today
- Item: FG-001 (Control Panel Assembly)
- Quantity: 1 PCS
- Select UID: Choose one finished product UID
- Issued To (Staff): Sales Executive - John Doe
- Department: Sales
- Purpose: Customer Demonstration
- Customer/Prospect: Prospect Industries Pvt Ltd
- Expected Demo Duration: 7 days
- Expected Return Date: Today + 7 days
- Demo Location: Customer site - Pune
- Status: Issued

**Demo Expenses Tracking:**
- Transportation Cost: 3000 INR
- Travel Allowance: 2000 INR
- Installation Support: 1500 INR
- Total Demo Cost: 6500 INR
- Expense Category: Demo - Pre-Sales

**What to verify:**
✓ Demo stock is issued with unique Demo ID
✓ Demo ID is linked to product UID
✓ Staff name and customer/prospect recorded
✓ Demo duration tracked
✓ Demo expenses can be logged against Demo ID
✓ Stock status changes to "Demo" from "Available"
✓ Demo item removed from available inventory
✓ Can view all active demos with return dates

---

### Step 27: Track Demo Activity
**Path:** Inventory → Demo Management → Demo Tracking

**Update Demo Status:**
- Demo ID: DEMO-2025-001
- Current Status: In Progress
- Customer Feedback: Positive - interested
- Demo Extension: Extend by 3 days (if needed)
- Staff Updates: Daily activity log

**Record Additional Demo Expenses:**
- Date: Today + 2 days
- Expense Type: Technical Support
- Amount: 1000 INR
- Description: On-site training for customer staff
- Total Demo Cost Updated: 7500 INR

**What to verify:**
✓ Can track demo status in real-time
✓ Can extend demo period with approval
✓ Multiple expenses can be added to same Demo ID
✓ Demo cost accumulates correctly
✓ Staff can update demo progress
✓ Overdue demos show alerts
✓ Can view demo history per product UID
✓ Demo activity log maintained

---

### Step 28: Demo Return or Sale Conversion
**Path:** Inventory → Demo Management → Close Demo

**Scenario A - Demo Returned:**
- Demo ID: DEMO-2025-001
- Return Date: Today + 7 days
- Return Condition: Good - No damage
- Inspection Result: Passed
- Action: Return to finished goods inventory
- Stock Status: Available (restored)
- Demo Expenses: 7500 INR written off as marketing expense
- Demo Outcome: Not Converted

**Scenario B - Demo Converted to Sale:**
- Demo ID: DEMO-2025-001
- Conversion Date: Today + 7 days
- Customer Order: Create Sales Order from demo
- Customer: Prospect Industries (convert to customer)
- Sales Order Value: 285000 INR
- Demo Cost Attribution: Link 7500 INR expense to this sale
- Net Profit: Sales Value - Demo Cost - Product Cost
- Demo Outcome: Converted - Success

**What to verify:**
✓ Can return demo stock to inventory
✓ Returned stock goes back to available status
✓ Can convert demo directly to sales order
✓ Demo expenses automatically linked to sale
✓ System calculates net profit after demo cost
✓ Customer/prospect converted to customer master
✓ Stock doesn't return to inventory if sold
✓ UID maintains complete demo history
✓ Demo conversion rate tracked

---

### Step 29: Demo Reports & Analytics
**Path:** Reports → Demo Management Reports

**Test Reports:**

**Demo Inventory Report:**
- All items currently on demo
- Demo ID, Staff, Customer, Issue Date
- Expected return date vs actual
- Overdue demos highlighted

**Demo Cost Analysis:**
- Demo ID wise expense breakdown
- Transportation, travel, support costs
- Total demo cost per product
- Demo cost vs sales value (for converted demos)

**Demo Conversion Report:**
- Total demos issued: Count
- Demos returned: Count & %
- Demos converted to sales: Count & %
- Conversion rate: Converted / Total
- Average demo duration
- Average demo cost
- Revenue from converted demos
- ROI: (Sales - Demo Cost) / Demo Cost

**Demo Staff Performance:**
- Staff wise demo assignments
- Conversion success rate per staff
- Average demo cost per staff
- Revenue generated per staff

**What to verify:**
✓ All active demos visible in one report
✓ Overdue demos flagged automatically
✓ Demo cost breakdown accurate
✓ Conversion rates calculated correctly
✓ Can filter by date range, staff, product
✓ Export to Excel/PDF works
✓ Charts show conversion trends
✓ Staff performance metrics accurate
✓ ROI calculations correct

---

## 👥 PHASE 10: HR & PAYROLL MANAGEMENT

### Step 30: Employee Master Setup
**Path:** HR → Employees → Create Employee

**Test Data:**

**Employee 1:**
- Employee ID: EMP-001
- Employee Name: Rajesh Kumar
- Designation: Production Supervisor
- Department: Production
- Date of Joining: 01-Jan-2023
- Employment Type: Full-Time Permanent
- Email: rajesh.kumar@saifautomations.com
- Mobile: +91-9876543230
- Address: Mumbai, Maharashtra
- PAN Number: ABCDE1234F
- Aadhaar Number: 1234-5678-9012
- Bank Account: HDFC Bank - 12345678901234
- IFSC Code: HDFC0001234
- Status: Active

**Employee 2:**
- Employee ID: EMP-002
- Name: Priya Sharma
- Designation: Quality Inspector
- Department: Quality
- Employment Type: Full-Time Permanent
- Status: Active

**What to verify:**
✓ Employee master created with all details
✓ Can upload employee photo and documents
✓ Bank details captured for salary transfer
✓ Employee ID auto-generated or manual entry
✓ Can search employees by name/ID/department
✓ Employee status (Active/Inactive) manageable
✓ Can assign reporting manager

---

### Step 31: Salary Structure Definition
**Path:** HR → Salary Components → Define Components

**Test Salary Components:**

**Earnings:**
1. Basic Salary: 25000 INR (Fixed)
2. HRA (House Rent Allowance): 10000 INR (Fixed)
3. Conveyance: 2000 INR (Fixed)
4. Special Allowance: 5000 INR (Fixed)
5. Performance Bonus: Variable (0-5000 INR)

**Deductions:**
1. PF (Provident Fund): 12% of Basic (Auto-calculated)
2. ESI (Employee State Insurance): 0.75% of Gross (Auto-calculated)
3. Professional Tax: 200 INR (Fixed)
4. TDS (Tax Deducted at Source): As per IT rules (Variable)

**Assign to Employee:**
- Employee: EMP-001 (Rajesh Kumar)
- Basic Salary: 25000 INR
- HRA: 10000 INR
- Conveyance: 2000 INR
- Special Allowance: 5000 INR
- Gross Salary: 42000 INR
- PF Deduction: 3000 INR (12% of 25000)
- ESI Deduction: 315 INR (0.75% of 42000)
- PT Deduction: 200 INR
- Net Salary: 38485 INR

**What to verify:**
✓ Salary components can be defined
✓ Fixed and variable components supported
✓ Auto-calculation formulas work (PF, ESI)
✓ Can assign different structures to employees
✓ Gross and net salary calculated correctly
✓ Can modify salary structure with effective date
✓ Historical salary changes maintained

---

### Step 32: Attendance Recording
**Path:** HR → Attendance → Mark Attendance

**Test Data:**

**Method A - Manual Entry:**
- Date: Today
- Employee: EMP-001 (Rajesh Kumar)
- Status: Present
- In Time: 09:00 AM
- Out Time: 06:00 PM
- Working Hours: 9 hours
- Overtime: 0 hours

**Method B - Biometric Integration (if available):**
- Auto-fetch attendance from biometric device
- Verify data synced correctly

**Attendance for Multiple Days:**
- Day 1: Present - 9 hours
- Day 2: Present - 10 hours (1 hour OT)
- Day 3: Half Day - 4 hours
- Day 4: Absent
- Day 5: On Leave (Approved)
- Day 6: Present - 9 hours
- Day 7: Weekly Off

**What to verify:**
✓ Manual attendance entry works
✓ Biometric data syncs automatically (if configured)
✓ Working hours calculated correctly
✓ Overtime detected and flagged
✓ Half day, full day, absent tracked
✓ Approved leaves marked separately
✓ Weekly offs excluded from working days
✓ Can bulk upload attendance via Excel
✓ Attendance summary shows month-to-date
✓ Can view attendance calendar per employee

---

### Step 33: Leave Management
**Path:** HR → Leave → Leave Request

**Test Data:**

**Leave Types Setup:**
1. Casual Leave: 12 days per year
2. Sick Leave: 12 days per year
3. Earned Leave: 15 days per year
4. Maternity Leave: 180 days (for eligible)
5. Paternity Leave: 7 days

**Leave Request:**
- Employee: EMP-001 (Rajesh Kumar)
- Leave Type: Casual Leave
- From Date: Tomorrow
- To Date: Tomorrow + 2 days (3 days total)
- Reason: Personal work
- Status: Pending Approval

**Leave Approval Workflow:**
- Submitted By: Employee
- Approver: Department Head
- Approval Status: Approved
- Approved By: Production Manager
- Approval Date: Today
- Final Status: Approved

**What to verify:**
✓ Leave types configured with balance
✓ Employee can see leave balance
✓ Leave request submitted successfully
✓ Approval workflow triggers
✓ Approver receives notification
✓ Can approve/reject with comments
✓ Leave balance deducted after approval
✓ Approved leaves reflect in attendance
✓ Can view leave history
✓ Leave reports show balance and utilization

---

### Step 34: Payroll Processing
**Path:** HR → Payroll → Run Payroll

**Test Data:**

**Payroll Run for Month:**
- Month: Current Month (e.g., November 2025)
- Department: All / Production (filter option)
- Status: Draft

**For Employee EMP-001:**
- Working Days in Month: 30 days
- Present Days: 26 days
- Leaves: 2 days (approved CL)
- Absent: 2 days
- Weekly Offs: 4 days
- Payable Days: 28 days (26 + 2 approved leaves)

**Salary Calculation:**
- Basic Salary: 25000 INR
- HRA: 10000 INR
- Conveyance: 2000 INR
- Special Allowance: 5000 INR
- Overtime Pay: 500 INR (calculated from attendance)
- Gross Earnings: 42500 INR

**Deductions:**
- PF: 3000 INR
- ESI: 318.75 INR
- Professional Tax: 200 INR
- Loss of Pay (2 absent days): 1400 INR (calculated)
- Total Deductions: 4918.75 INR

**Net Salary:** 37581.25 INR

**What to verify:**
✓ Payroll processes for selected month
✓ Attendance data auto-pulled
✓ Working days calculated correctly
✓ Leaves and absents considered
✓ Loss of pay calculated for absents
✓ Overtime pay added (if applicable)
✓ All deductions applied correctly
✓ Net salary accurate
✓ Can review before finalizing
✓ Payroll summary shows all employees

---

### Step 35: Payslip Generation & Distribution
**Path:** HR → Payroll → Generate Payslips

**Test Data:**
- Payroll Run: November 2025
- Status: Change from Draft to Approved
- Generate Payslips: For all employees

**Payslip Content (for EMP-001):**
- Employee Details: Name, ID, Designation, Department
- Salary Period: November 2025
- Payment Date: 1st December 2025
- Attendance Summary: Present, Leave, Absent days

**Earnings:**
| Component | Amount (INR) |
|-----------|-------------|
| Basic Salary | 25000 |
| HRA | 10000 |
| Conveyance | 2000 |
| Special Allowance | 5000 |
| Overtime | 500 |
| **Gross Earnings** | **42500** |

**Deductions:**
| Component | Amount (INR) |
|-----------|-------------|
| PF | 3000 |
| ESI | 318.75 |
| Professional Tax | 200 |
| Loss of Pay | 1400 |
| **Total Deductions** | **4918.75** |

**Net Payable:** 37581.25 INR

**Distribution:**
- Status: Approved & Released
- Send Email: Send payslip PDF to employee email
- Bank Transfer: Generate NEFT file for salary transfer
- Payment Status: Pending / Paid

**What to verify:**
✓ Payslips generated for all employees
✓ Payslip PDF format correct
✓ All earnings and deductions shown
✓ Net payable amount highlighted
✓ Can email payslips to employees automatically
✓ Email delivery successful
✓ Can download individual or bulk payslips
✓ Bank transfer file generated (NEFT format)
✓ Payment status trackable
✓ Payslip history maintained
✓ Can regenerate if needed

---

### Step 36: HR Reports & Analytics
**Path:** Reports → HR Reports

**Test Key HR Reports:**

**Attendance Reports:**
- Monthly attendance register (all employees)
- Daily attendance summary
- Late coming report
- Early leaving report
- Overtime hours report
- Absent employees report

**Leave Reports:**
- Leave balance report (all employees)
- Leave taken vs available
- Leave trend analysis
- Department-wise leave utilization

**Payroll Reports:**
- Monthly payroll register
- Salary component breakup
- Deduction summary (PF, ESI, PT)
- Bank transfer summary
- Cost to company (CTC) report
- Year-to-date salary report

**Employee Reports:**
- Employee master list
- New joiners report
- Exit/resignation report (if applicable)
- Department-wise headcount
- Designation-wise distribution

**What to verify:**
✓ All reports generate successfully
✓ Data accurate and up-to-date
✓ Can filter by date, department, employee
✓ Export to Excel/PDF works
✓ Payroll register matches payslips
✓ Statutory reports (PF, ESI) accurate
✓ Charts show attendance/leave trends
✓ Report performance acceptable

---

## 🔧 PHASE 11: ADVANCED FEATURES

### Step 37: Item Technical Drawings
**Path:** Master Data → Items → Item Drawings

**Test Data:**
For item FG-001 (Control Panel Assembly):

**Drawing 1 - Assembly Drawing:**
- Drawing Number: DWG-FG-001-001
- Drawing Title: Control Panel Assembly - Main View
- Revision: Rev A
- Drawing Type: Assembly Drawing
- File Format: PDF
- Upload File: Assembly drawing PDF
- Created By: Engineering Team
- Approved By: Chief Engineer
- Approval Date: Today
- Status: Approved

**Drawing 2 - Technical Specification:**
- Drawing Number: DWG-FG-001-002
- Drawing Title: Control Panel Technical Specifications
- Revision: Rev A
- Drawing Type: Technical Specification
- File Format: PDF
- Related Standard: IEC 61439
- Status: Approved

**What to verify:**
✓ Drawings are uploaded and linked to item
✓ Multiple drawings can be attached to one item
✓ Drawing revision control works
✓ Can view/download drawings from item master
✓ Drawing approval workflow functions
✓ Can search drawings by item/drawing number
✓ Drawings are accessible during production planning

---

### Step 38: Stock Reservations
**Path:** Inventory → Stock Reservations → Create Reservation

**Test Data:**

**Reservation 1 - For Sales Order:**
- Reservation Type: Sales Order
- Reference: SO from Step 13
- Customer: C001 (Tech Manufacturing Co)
- Item: FG-001 (Control Panel Assembly)
- Reserved Quantity: 18 PCS
- Reservation Date: Today
- Required By Date: SO delivery date
- Plant/Warehouse: MAIN-001
- Status: Active
- Priority: High

**Reservation 2 - For Production Order:**
- Reservation Type: Production Order
- Reference: Production Order from Step 14
- Item: RM-001 (Steel Sheet)
- Reserved Quantity: 40 KG
- Required By Date: Production start date
- Status: Active

**Release Reservation:**
- After delivery/production completion
- Update reservation status to "Fulfilled"
- Stock becomes available again

**What to verify:**
✓ Stock can be reserved for specific orders
✓ Reserved stock shows separately in inventory
✓ Available stock = Total stock - Reserved stock
✓ System prevents over-reservation
✓ Reservations auto-release after order fulfillment
✓ Can manually release/cancel reservations
✓ Reserved stock is allocated during picking
✓ Reports show reserved vs available stock

---

### Step 39: Production Order Components Tracking
**Path:** Production → Production Orders → Component Allocation

**Test Data:**
For Production Order from Step 14:

**Component Allocation:**
- Production Order: PO-FG-001-XXX
- Product: FG-001 (Control Panel Assembly)
- Quantity: 20 PCS

**Component 1 - Circuit Board:**
- Component: COMP-001 (Circuit Board PCB-100)
- Required Quantity (per BOM): 1 PCS per unit
- Total Required: 20 PCS
- Allocated Quantity: 20 PCS
- Allocated From: Raw Material Store
- UID/Batch: Select specific batches
- Allocation Date: Today
- Status: Allocated

**Component 2 - Steel Sheet:**
- Component: RM-001 (Steel Sheet 304)
- Required Quantity: 2 KG per unit
- Total Required: 40 KG
- Allocated Quantity: 40 KG
- Allocated From: Raw Material Store
- UID/Batch: Select specific batches
- Status: Allocated

**Track Component Consumption:**
- Issued Quantity: 40 KG
- Consumed Quantity: 38 KG (actual usage)
- Scrap Quantity: 2 KG
- Return to Store: 0 KG
- Variance: -2 KG (scrap)
- Variance Reason: Normal cutting waste

**What to verify:**
✓ Components are allocated to production orders
✓ System tracks required vs allocated vs consumed
✓ Can allocate specific UIDs/batches to production
✓ Material consumption is tracked per component
✓ Variances (scrap/returns) are recorded
✓ Component traceability maintained through production
✓ Stock levels update based on actual consumption
✓ Can view component allocation history
✓ Reports show material efficiency and waste

---

### Step 40: Dispatch Management
**Path:** Sales → Dispatch → Create Dispatch Note

**Test Data:**
After Delivery Note creation (Step 20):

**Dispatch Note:**
- Dispatch Note Number: DN-2025-001
- Dispatch Date: Today
- Dispatch Time: 10:00 AM
- Sales Order: SO from Step 13
- Delivery Note: DN from Step 20
- Customer: C001 (Tech Manufacturing Co)
- Shipping Address: Customer's shipping address
- Dispatch Mode: By Road

**Vehicle & Logistics:**
- Transporter Name: Fast Logistics Pvt Ltd
- Vehicle Number: MH-02-CD-5678
- Driver Name: Ramesh Kumar
- Driver License: MH1234567890
- Driver Contact: +91-9876543220
- E-Way Bill Number: 123456789012 (for GST)
- LR Number: LR-2025-12345 (Lorry Receipt)
- Freight Charges: 2500 INR
- Insurance: Yes - 5000 INR coverage

**Dispatch Items:**
1. Item: FG-001 (Control Panel Assembly)
   - Quantity: 18 PCS
   - Package Type: Wooden Crate
   - Number of Packages: 2 crates
   - Gross Weight: 150 KG
   - Net Weight: 135 KG
   - Dimensions: 100cm x 80cm x 60cm per crate
   - UID List: Select 18 product UIDs

**Tracking Information:**
- Expected Delivery: Tomorrow 5:00 PM
- Route: Mumbai → Bangalore via NH48
- Checkpoints: Add tracking checkpoints
- Status: In Transit

**Dispatch Received:**
- Delivery Date: Tomorrow 5:30 PM
- Received By: Customer warehouse person
- Condition: All items received in good condition
- Signature: Customer sign-off
- Status: Delivered

**What to verify:**
✓ Dispatch note is created with all logistics details
✓ Can link to sales order and delivery note
✓ E-way bill and LR numbers are captured
✓ Package details (weight, dimensions) are tracked
✓ Vehicle and driver information is recorded
✓ Can track dispatch status in real-time
✓ Customer can view dispatch tracking (if portal exists)
✓ Dispatch completion updates sales order status
✓ Can print dispatch challan with barcode
✓ Freight charges are captured for invoicing
✓ POD (Proof of Delivery) is uploaded and stored
✓ Reports show dispatch performance and delays

---

### Step 41: Inventory Management
**Path:** Inventory → Stock Overview

**Test Actions:**

**A. View Current Stock:**
- Check stock levels for all items
- View stock by plant/location
- Check items below reorder level
- View stock aging

**B. Stock Adjustment:**
- Create stock adjustment for physical count differences
- Reason: Physical verification
- Adjust quantities as needed

**C. Stock Transfer:**
- Transfer items between plants (if multiple plants)
- Transfer between storage locations
- Track transfer in-transit

**What to verify:**
✓ Real-time stock visibility
✓ Stock movements are tracked
✓ Adjustments are recorded with reasons
✓ Can view stock history
✓ Low stock alerts work
✓ Stock valuation is correct

---

### Step 42: Reports & Analytics
**Path:** Reports → Various Report Sections

**Test Key Reports:**

**Production Reports:**
- Production Order Status Report
- Daily Production Summary
- Station Efficiency Report
- Material Consumption Report
- Defect Analysis Report

**Inventory Reports:**
- Current Stock Report
- Stock Movement Report
- Slow Moving Items Report
- Stock Valuation Report
- UID Tracking Report

**Purchase Reports:**
- Purchase Order Status Report
- Vendor Performance Report
- GRN Register
- Purchase Analysis Report

**Sales Reports:**
- Sales Order Status Report
- Customer Order History
- Sales vs Production Report
- Dispatch Register
- Invoice Register

**Quality Reports:**
- Inspection Summary Report
- NCR Status Report
- Defect Analysis Report
- Vendor Quality Report

**What to verify:**
✓ All reports generate successfully
✓ Data is accurate and up-to-date
✓ Can filter reports by date, plant, item, etc.
✓ Can export reports (Excel, PDF)
✓ Charts and graphs display correctly
✓ Report performance is acceptable

---

### Step 43: Document Management
**Path:** Documents → Document Control

**Test Actions:**

**A. Create Document Category:**
- Category: Standard Operating Procedures
- Code: SOP
- Description: Company SOPs

**B. Upload Document:**
- Document Type: SOP
- Document Number: SOP-001
- Title: Production Assembly Procedure
- Upload File: PDF document
- Version: 1.0
- Effective Date: Today
- Review Date: 1 year from today
- Owner: Quality Manager

**C. Document Revision:**
- Create revision of SOP-001
- Update to version 2.0
- Upload revised file
- Mark previous version as obsolete

**What to verify:**
✓ Documents can be uploaded and categorized
✓ Version control works correctly
✓ Can search and retrieve documents
✓ Document approval workflow works
✓ Can view document history
✓ Access control works (if configured)

---

### Step 44: UID Traceability
**Path:** UID Management → UID Tracking

**Test Full Traceability:**

Select any finished product UID and trace:

**Forward Traceability:**
- Where was it sold? (Customer, Invoice)
- When was it delivered? (Delivery Note)
- Any service history? (Service Requests)

**Backward Traceability:**
- Which production order? (Production Order Number)
- When was it produced? (Production Date)
- Which materials were used? (Raw Material UIDs from BOM)
- Which vendor supplied materials? (Vendor, GRN details)
- Quality inspections passed? (Inspection records)
- Any defects during production? (Defect records)

**What to verify:**
✓ Complete end-to-end traceability
✓ Can scan QR code to view full history
✓ All transactions are linked via UID
✓ Can generate traceability report
✓ Audit trail is complete

---

## 📊 PHASE 12: FINAL VERIFICATION

### Step 45: System Integration Checks

**Cross-Module Verification:**

**A. Production to Inventory:**
- Production completion increases finished goods
- Material issue reduces raw material stock
- Defects are tracked separately

**B. Purchase to Inventory to Production:**
- GRN increases inventory
- Material issue to production is available
- UIDs flow through the process

**C. Sales to Production:**
- Sales order triggers production planning
- Production fulfills sales demand
- Delivery reduces inventory

**D. Quality Integration:**
- Inspections affect stock status
- NCRs prevent usage of defective material
- Quality holds block transactions

**What to verify:**
✓ Data flows seamlessly between modules
✓ No data discrepancies
✓ Stock quantities are accurate across modules
✓ UIDs maintain integrity throughout

---

### Step 46: User Access & Security
**Path:** Admin → User Management

**Test Actions:**

**A. Create Users:**
- Create users for different roles
- Production Manager
- Purchase Officer
- Sales Executive
- Quality Inspector
- Store Keeper

**B. Test Role-Based Access:**
- Login as different users
- Verify each can access only allowed modules
- Test permissions (view, create, edit, delete)

**What to verify:**
✓ Role-based access control works
✓ Users see only relevant menus
✓ Permissions are enforced
✓ Audit logs track user actions

---

### Step 47: Performance & Backup

**Final System Checks:**

**A. Performance:**
- Test with realistic data volumes
- Check page load times
- Test report generation speed
- Verify search functionality

**B. Data Backup:**
- Verify backup schedule is configured
- Test backup restoration (if possible)
- Document backup procedures

**C. System Health:**
- Check server resource usage
- Verify database connections
- Test email notifications (if configured)
- Check error logs

**What to verify:**
✓ System performs well under load
✓ Backups are working
✓ No critical errors in logs
✓ All integrations are functioning

---

## ✅ TESTING COMPLETION CHECKLIST

### Production Module
- [ ] Production orders created and tracked
- [ ] BOM defined and used in production
- [ ] Routing operations defined
- [ ] Material issued to production
- [ ] Station completions recorded
- [ ] Defects tracked and managed
- [ ] Finished goods received with UIDs
- [ ] Production order components allocated and tracked
- [ ] Material consumption vs planned tracked

### Purchase Module
- [ ] Purchase requisitions created
- [ ] Purchase orders generated
- [ ] GRN processed for receipts
- [ ] Vendor management working
- [ ] UIDs generated for received items

### Sales Module
- [ ] Quotations created and sent
- [ ] Sales orders confirmed
- [ ] Delivery notes created
- [ ] Invoices generated
- [ ] Customer management working
- [ ] Dispatch notes created with logistics details
- [ ] Dispatch tracking functional
- [ ] E-way bills and LR numbers captured

### Inventory Module
- [ ] Stock levels accurate
- [ ] Stock movements tracked
- [ ] UIDs tracked throughout
- [ ] Stock adjustments working
- [ ] Locations/plants managed
- [ ] Stock reservations created and managed
- [ ] Reserved vs available stock visible
- [ ] Reservation auto-release working

### Quality Module
- [ ] Inspections recorded
- [ ] NCRs created and tracked
- [ ] Defects managed
- [ ] Quality data linked to UIDs

### Service Module
- [ ] Service requests created
- [ ] Requests processed and closed
- [ ] Service history maintained
- [ ] Warranty tracking working
- [ ] Warranty claims created and processed
- [ ] Warranty validation working

### Master Data Module
- [ ] Items with categories created
- [ ] Customers and vendors managed
- [ ] Warehouses/plants configured
- [ ] Item technical drawings uploaded
- [ ] Drawing revision control working
- [ ] Drawings accessible from production

### Demo Stock Module
- [ ] Demo stock issued with Demo ID
- [ ] Demo tracking functional
- [ ] Demo expenses logged correctly
- [ ] Demo return process working
- [ ] Demo to sales conversion working
- [ ] Demo cost attribution accurate
- [ ] Demo reports and analytics functional

### HR & Payroll Module
- [ ] Employee master created
- [ ] Salary structures defined
- [ ] Attendance recording working
- [ ] Leave management functional
- [ ] Payroll processing accurate
- [ ] Payslips generated and emailed
- [ ] HR reports functional

### Reports & Analytics
- [ ] All key reports working
- [ ] Data accuracy verified
- [ ] Export functions working
- [ ] Dashboard displaying correctly

### System Features
- [ ] UID traceability complete
- [ ] Document management working
- [ ] User access control working
- [ ] System performance acceptable
- [ ] Email notifications working (if configured)

---

## 🚨 COMMON ISSUES & TROUBLESHOOTING

### Issue 1: Cannot create production order
**Possible Causes:**
- BOM not defined for the item
- Insufficient material stock
- Item not marked as "Manufactured" type

**Solution:**
- Create BOM first
- Check material availability
- Verify item master setup

### Issue 2: UID generation fails
**Possible Causes:**
- GRN not approved
- Item not configured for UID tracking
- Quantity mismatch

**Solution:**
- Approve GRN first
- Enable UID tracking in item master
- Verify accepted quantities

### Issue 3: Stock not updating
**Possible Causes:**
- Transaction not approved/posted
- Incorrect plant/location selection
- System date/time issues

**Solution:**
- Complete transaction workflow
- Verify location settings
- Check system date settings

### Issue 4: Report not showing data
**Possible Causes:**
- Date range too narrow
- Filters excluding data
- Data not yet processed

**Solution:**
- Expand date range
- Reset filters
- Wait for processing (check with admin)

---

## 📞 SUPPORT CONTACT

For any issues during testing:
- **Technical Support:** [Your support email]
- **System Admin:** [Admin contact]
- **Documentation:** [Link to detailed docs]

---

## 📝 TESTING FEEDBACK FORM

After completing testing, please provide feedback on:

1. **Ease of Use:** How intuitive is the system? (1-5)
2. **Performance:** Is the system responsive? (1-5)
3. **Feature Completeness:** Does it meet your requirements? (1-5)
4. **Issues Encountered:** List any bugs or problems
5. **Missing Features:** What features would you like added?
6. **Overall Satisfaction:** Rate your overall experience (1-5)

**Additional Comments:**
[Space for detailed feedback]

---

## 🎯 NEXT STEPS AFTER TESTING

1. **Review Findings:** Discuss any issues or concerns
2. **Training Plan:** Schedule user training sessions
3. **Go-Live Planning:** Plan production deployment
4. **Data Migration:** Import existing data (if needed)
5. **Support Agreement:** Establish ongoing support

---

**Document Version:** 1.0
**Last Updated:** November 29, 2025
**Prepared By:** SAK ERP Implementation Team

---

## 📌 NOTES

- This guide assumes you're starting with a clean database
- All test data is sample only - adjust to your business needs
- Some features may require specific configuration
- Take screenshots during testing for reference
- Document any deviations from expected behavior
- Test one module completely before moving to the next
- Keep track of all UIDs generated for traceability testing

**Good luck with your testing! 🎉**
