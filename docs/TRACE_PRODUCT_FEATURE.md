# 🔍 Trace Product Feature - Complete Documentation

## Overview

The **Trace Product** feature provides end-to-end product traceability from raw material receipt to customer delivery. It visualizes the complete lifecycle, component genealogy, quality checkpoints, and supply chain details in an interactive, user-friendly interface.

---

## 🎯 Key Features

### 1. **Visual Timeline** 📅
- **Purpose**: Show chronological journey of every product/material
- **Displays**:
  - All lifecycle events with timestamps
  - Stage icons (📦 Receipt, 🔍 QC, 🏭 Production, 🚚 Shipping)
  - Location at each stage
  - User who performed action
  - Reference documents (GRN, PO, SO, Invoice)
  
**Example Timeline Events:**
```
📦 RECEIVED → Warehouse-A (2025-11-01 10:00 AM)
   Reference: GRN-2025-11-001
   By: supervisor@company.com

🔍 INCOMING_QC_PASSED → QC Lab (2025-11-01 02:30 PM)
   Reference: QC Report #123
   By: qc_inspector@company.com

🏭 CONSUMED_IN_PRODUCTION → Assembly Line 1 (2025-11-05 09:15 AM)
   Reference: Production Order PO-2025-001
   By: operator@company.com

🚚 SHIPPED_TO_CUSTOMER → Delivery (2025-11-10 03:00 PM)
   Reference: Invoice INV-2025-456
   By: logistics@company.com
```

---

### 2. **Component Tree Diagram** 🌳
- **Purpose**: Show Bill of Materials (BOM) breakdown
- **Displays**:
  - All raw materials/components used
  - Component UIDs (clickable to trace each component)
  - Batch numbers
  - Vendor names
  - Received dates
  - QC status of each component
  
**Example:**
```
Finished Product: UID-SAIF-KOL-FG-000123-A1
├── Component 1: UID-SAIF-KOL-RM-000045-B2
│   ├── Item: STEEL-PLATE-304
│   ├── Batch: BATCH-2025-001
│   ├── Vendor: ABC Steel Industries
│   ├── Received: 2025-10-25
│   └── QC Status: PASSED
│
├── Component 2: UID-SAIF-KOL-RM-000067-C3
│   ├── Item: BEARING-6205
│   ├── Batch: BATCH-2025-012
│   ├── Vendor: XYZ Bearings Ltd
│   ├── Received: 2025-10-28
│   └── QC Status: PASSED
│
└── Component 3: UID-SAIF-KOL-RM-000089-D4
    ├── Item: MOTOR-500W
    ├── Batch: BATCH-2025-008
    ├── Vendor: PowerTech Motors
    ├── Received: 2025-11-01
    └── QC Status: PASSED
```

---

### 3. **Vendor Details** 🏢
- **Purpose**: Identify supplier for quality issues/returns
- **Displays**:
  - Vendor code
  - Vendor name
  - Contact person and email
  - Automatically extracted from GRN records
  
**Example:**
```
Vendor Code: VEND-001
Vendor Name: ABC Steel Industries Pvt Ltd
Contact: Rajesh Kumar (rajesh.kumar@abcsteel.com)
```

---

### 4. **Quality Checkpoints** ✅
- **Purpose**: Track all quality inspections and results
- **Displays**:
  - Stage of inspection (Incoming QC, In-Process, Final QC)
  - Pass/Fail status
  - Inspector name
  - Date and time
  - Notes/observations
  
**Example:**
```
Checkpoint 1: INCOMING_QC
Status: PASSED ✅
Date: 2025-11-01 02:30 PM
Inspector: qc_inspector@company.com
Notes: Material meets specification

Checkpoint 2: IN_PROCESS_QC
Status: PASSED ✅
Date: 2025-11-05 11:00 AM
Inspector: production_qc@company.com
Notes: Dimensions within tolerance

Checkpoint 3: FINAL_QC
Status: PASSED ✅
Date: 2025-11-08 04:00 PM
Inspector: final_qc@company.com
Notes: All tests passed, ready for shipment
```

---

### 5. **Current Customer Location** 👤
- **Purpose**: Know where finished products are currently located
- **Displays**:
  - Customer name
  - Delivery location
  - Delivery date
  - Invoice number
  - Extracted from shipping/delivery events
  
**Example:**
```
Customer Name: TechCorp Industries Pvt Ltd
Location: 📍 Mumbai, Maharashtra - 400001
Delivery Date: 2025-11-10 03:00 PM
Invoice Number: INV-2025-456
```

---

## 🚀 How to Use

### Method 1: Direct URL
```
Navigate to: http://13.205.17.214:3000/dashboard/uid/trace
Enter UID: UID-SAIF-KOL-FG-000123-A1
Click: "Trace Product"
```

### Method 2: From UID Management Page
```
1. Go to Dashboard → UID Tracking
2. Find the UID you want to trace
3. Click "View Full Trace" button
4. Complete trace opens in new interface
```

### Method 3: From Component Tree
```
1. Trace any finished product
2. In Component Tree section, click "→ Trace this component"
3. Drill down to raw material level
4. See complete supplier trail
```

---

## 📊 API Endpoint

### GET `/api/v1/uid/trace/:uid`

**Request:**
```bash
curl -X GET http://13.205.17.214:4000/api/v1/uid/trace/UID-SAIF-KOL-FG-000123-A1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response Structure:**
```json
{
  "uid": "UID-SAIF-KOL-FG-000123-A1",
  "entity_type": "FG",
  "item": {
    "code": "MOTOR-ASSEMBLY-500W",
    "name": "500W Motor Assembly",
    "category": "Finished Goods"
  },
  "status": "SHIPPED",
  "location": "Customer Site - Mumbai",
  "lifecycle": [
    {
      "stage": "RECEIVED",
      "timestamp": "2025-11-01T10:00:00Z",
      "location": "Warehouse-A",
      "reference": "GRN-2025-11-001",
      "user": "supervisor@company.com"
    },
    {
      "stage": "QC_PASSED",
      "timestamp": "2025-11-01T14:30:00Z",
      "location": "QC Lab",
      "reference": "QC Report #123",
      "user": "qc_inspector@company.com"
    }
  ],
  "components": [
    {
      "uid": "UID-SAIF-KOL-RM-000045-B2",
      "item_code": "STEEL-PLATE-304",
      "item_name": "Stainless Steel Plate 304",
      "batch_number": "BATCH-2025-001",
      "vendor_name": "ABC Steel Industries",
      "received_date": "2025-10-25",
      "qc_status": "PASSED"
    }
  ],
  "parent_products": [],
  "vendor": {
    "code": "VEND-001",
    "name": "ABC Steel Industries Pvt Ltd",
    "contact": "Rajesh Kumar (rajesh.kumar@abcsteel.com)"
  },
  "quality_checkpoints": [
    {
      "stage": "INCOMING_QC",
      "status": "PASSED",
      "date": "2025-11-01T14:30:00Z",
      "inspector": "qc_inspector@company.com",
      "notes": "Material meets specification"
    }
  ],
  "customer": {
    "name": "TechCorp Industries Pvt Ltd",
    "location": "Mumbai, Maharashtra - 400001",
    "delivery_date": "2025-11-10T15:00:00Z",
    "invoice_number": "INV-2025-456"
  }
}
```

---

## 💡 Use Cases

### Use Case 1: Quality Issue Investigation
**Scenario:** Customer reports defective product

**Steps:**
1. Get product UID from customer complaint
2. Open Trace Product page
3. Enter UID and click "Trace Product"
4. View Component Tree to identify all materials used
5. Check Quality Checkpoints for any failed inspections
6. Identify vendor from Vendor Details section
7. Trace each component's UID to find root cause
8. Issue Return to Vendor (RTV) if supplier defect
9. Initiate repair/rework if manufacturing defect

**Result:** Complete traceability from customer → finished product → components → supplier

---

### Use Case 2: Recall Management
**Scenario:** Supplier issues recall for specific batch

**Steps:**
1. Get batch number from supplier notice
2. Search for all UIDs with that batch number
3. For each UID, click "Used In Products"
4. View Parent Products section to see finished goods
5. Check Customer Location for each finished product
6. Generate list of affected customers
7. Initiate recall process

**Result:** Identify all affected products and customers within minutes

---

### Use Case 3: Audit Trail
**Scenario:** ISO audit requires complete documentation

**Steps:**
1. Select sample finished product UID
2. Open Trace Product page
3. Print/export complete timeline
4. Shows all quality checkpoints passed
5. Vendor certifications linked
6. Complete chain of custody documented

**Result:** Full compliance documentation in single view

---

### Use Case 4: Supplier Performance Analysis
**Scenario:** Evaluating supplier quality

**Steps:**
1. Trace multiple UIDs from same vendor
2. Check Quality Checkpoints across products
3. Identify patterns (e.g., frequent rejections)
4. View timeline to measure lead times
5. Make data-driven sourcing decisions

**Result:** Objective supplier evaluation data

---

## 🎨 Visual Elements Explained

### Timeline Icons:
- 📦 = Material Receipt
- 🔍 = Quality Inspection
- 🏭 = Production/Assembly
- 🚚 = Shipping/Delivery
- ⚠️ = Defect Detected
- 🔧 = Repair/Rework
- 📍 = Location Change

### Status Badge Colors:
- 🟢 Green = PASSED, AVAILABLE, COMPLETED
- 🔴 Red = FAILED, DEFECTIVE, REJECTED
- 🟡 Yellow = PENDING, IN_PROGRESS
- 🔵 Blue = AVAILABLE (in stock)
- 🟣 Purple = CONSUMED (used in production)
- 🟠 Orange = IN_REPAIR, QUARANTINED

### Component Tree Colors:
- Blue gradient = Raw Materials/Components
- Orange gradient = Finished Products

---

## 🔧 Technical Implementation

### Frontend Component:
- **File:** `apps/web/src/app/dashboard/uid/trace/page.tsx`
- **Framework:** Next.js 14, React, TypeScript
- **Features:**
  - Real-time search
  - Interactive timeline with scroll
  - Clickable component tree for drill-down
  - Responsive design (mobile-friendly)
  - Print-ready layout

### Backend API:
- **File:** `apps/api/src/uid/services/uid-supabase.service.ts`
- **Method:** `getCompleteTrace(req, uid)`
- **Logic:**
  1. Fetch main UID record with item details
  2. Parse lifecycle events
  3. Extract vendor from GRN reference
  4. Filter quality checkpoints from lifecycle
  5. Fetch child UIDs (components) with details
  6. Fetch parent UIDs (finished products)
  7. Extract customer from shipping events
  8. Return consolidated trace object

### Database Tables Used:
- `uid_registry` - Main UID records
- `items` - Product/material details
- `vendors` - Supplier information
- `grn` - Goods Receipt Notes
- `production_assemblies` - Component linking
- `sales_orders` - Customer orders (future)
- `invoices` - Delivery documentation (future)

---

## 🚦 Benefits

### For Quality Department:
✅ Instant root cause identification  
✅ Complete inspection history  
✅ Vendor accountability  
✅ Batch recall capability  

### For Production:
✅ Component traceability  
✅ FIFO compliance verification  
✅ Rework history tracking  
✅ Assembly audit trail  

### For Supply Chain:
✅ Supplier performance data  
✅ Lead time analysis  
✅ Inventory aging visibility  
✅ Customer delivery tracking  

### For Compliance:
✅ ISO 9001 traceability requirement  
✅ FDA 21 CFR Part 11 compliance  
✅ Complete chain of custody  
✅ Audit-ready documentation  

---

## 📈 Future Enhancements

1. **PDF Export**: Generate printable trace reports
2. **Supplier Integration**: Link to supplier portals
3. **Customer Portal**: Allow customers to trace their products
4. **QR Code Scanning**: Mobile app for instant trace
5. **Predictive Analytics**: Identify defect patterns
6. **Blockchain Integration**: Immutable trace records
7. **Visual Maps**: Geographic tracking on world map
8. **Performance Metrics**: MTBF, defect rates per vendor

---

## 🆘 Troubleshooting

### Issue: "UID not found"
**Solution:** 
- Verify UID format is correct (UID-TENANT-PLANT-TYPE-SEQUENCE-CHECKSUM)
- Check if UID exists in database
- Ensure you're logged in with correct tenant

### Issue: Component tree is empty
**Solution:**
- This UID may be a raw material (no components)
- Check if production assembly was completed
- Verify UID linking was executed during production

### Issue: Vendor details not showing
**Solution:**
- GRN must have vendor linked
- Lifecycle must contain GRN reference
- Check vendor record exists in vendors table

### Issue: Customer location blank
**Solution:**
- Product may not be shipped yet
- Sales order/invoice integration pending
- Add SHIPPED lifecycle event manually

---

## 📞 Support

For technical support or feature requests:
- Email: support@sakerp.com
- Documentation: `/docs/TRACE_PRODUCT_FEATURE.md`
- API Reference: `/docs/API_REFERENCE.md`

---

**Last Updated:** November 29, 2025  
**Version:** 1.0.0  
**Author:** SAK ERP Development Team
