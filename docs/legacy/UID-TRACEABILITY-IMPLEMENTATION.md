# UID TRACEABILITY REPORT - IMPLEMENTATION GUIDE

## Overview
Complete end-to-end traceability system for tracking UIDs from purchase through multi-level manufacturing.

## Features Implemented

### 1. **Complete Traceability Data**
- ✅ Part Name & Code
- ✅ Supplier Name, Code & GST
- ✅ Invoice Number & Date
- ✅ GRN Number & Date
- ✅ Work Order Number (if used in Sub-Assembly)
- ✅ Work Order for Sub-Assembly of Sub-Assembly (Multi-level)
- ✅ Full Assembly Hierarchy Path

### 2. **Database Components**
**File:** `add-uid-traceability-report.sql`

**Views:**
- `uid_traceability_report` - Complete traceability view for all UIDs

**Functions:**
- `get_uid_traceability(uid, tenant_id)` - Get full trace for one UID
- `get_grn_uids_traceability(grn_number, tenant_id)` - All UIDs from a GRN
- `get_work_order_material_traceability(work_order_number, tenant_id)` - Materials in work order

**Features:**
- Recursive query for multi-level sub-assembly tracking
- Performance indexes on all key relationships
- Handles up to 10 levels of assembly depth

### 3. **API Endpoints**
**File:** `apps/api/src/uid/traceability.controller.ts`

**Endpoints:**
```
GET /api/v1/uid/traceability/:uid
  - Get full traceability for specific UID

GET /api/v1/uid/traceability/grn/:grnNumber
  - Get all UIDs from a GRN with usage tracking

GET /api/v1/uid/traceability/work-order/:workOrderNumber
  - Get materials used in work order with sources

GET /api/v1/uid/traceability
  - Full report with filters:
    - uid, part_code, supplier_name
    - grn_number, work_order_number
    - assembly_name, level
    - from_date, to_date
    - limit, offset (pagination)

GET /api/v1/uid/traceability/export?format=csv
  - Export report as CSV (Excel coming soon)
```

### 4. **Service Layer**
**File:** `apps/api/src/uid/traceability.service.ts`

**Methods:**
- `getUidTraceability()` - Single UID trace
- `getGrnTraceability()` - GRN batch trace
- `getWorkOrderTraceability()` - Work order materials
- `getTraceabilityReport()` - Filtered report with pagination
- `exportReport()` - CSV/Excel export
- `getTraceabilityStats()` - Dashboard statistics

---

## Deployment Steps

### 1. **Run Database Migration**
```bash
# Connect to Supabase SQL Editor and run:
add-uid-traceability-report.sql
```

This will create:
- ✅ `uid_traceability_report` view
- ✅ 3 traceability functions
- ✅ Performance indexes

### 2. **Deploy API Changes**
```bash
# The following files are ready:
- apps/api/src/uid/traceability.controller.ts
- apps/api/src/uid/traceability.service.ts
- apps/api/src/uid/uid.module.ts (updated)

# Build and deploy:
.\deploy-hostinger.ps1
```

### 3. **Test API Endpoints**

**Test 1: Get UID Traceability**
```bash
GET http://72.62.192.228:4000/api/v1/uid/traceability/UID-12345
Authorization: Bearer <token>
```

**Expected Response:**
```json
[
  {
    "uid": "UID-12345",
    "part_code": "PART-001",
    "part_name": "Electronic Component",
    "supplier_name": "ABC Suppliers",
    "invoice_number": "INV-2025-001",
    "grn_number": "GRN-2025-001",
    "grn_date": "2025-01-15",
    "level": 0,
    "usage_type": "Raw Material / Purchased Part",
    "full_path": ""
  },
  {
    "uid": "UID-12345",
    "part_code": "PART-001",
    "part_name": "Electronic Component",
    "supplier_name": "ABC Suppliers",
    "invoice_number": "INV-2025-001",
    "grn_number": "GRN-2025-001",
    "work_order_number": "WO-2025-100",
    "assembly_name": "Control Module",
    "level": 1,
    "usage_type": "Used in Sub-Assembly",
    "full_path": "WO-2025-100"
  },
  {
    "uid": "UID-12345",
    "part_code": "PART-001",
    "part_name": "Electronic Component",
    "work_order_number": "WO-2025-200",
    "assembly_name": "Main System",
    "level": 2,
    "usage_type": "Used in Sub-Assembly of Sub-Assembly",
    "full_path": "WO-2025-100 → WO-2025-200"
  }
]
```

**Test 2: Get GRN Traceability**
```bash
GET http://72.62.192.228:4000/api/v1/uid/traceability/grn/GRN-2025-001
Authorization: Bearer <token>
```

**Test 3: Get Work Order Materials**
```bash
GET http://72.62.192.228:4000/api/v1/uid/traceability/work-order/WO-2025-100
Authorization: Bearer <token>
```

**Test 4: Filtered Report**
```bash
GET http://72.62.192.228:4000/api/v1/uid/traceability?supplier_name=ABC&level=1&limit=50
Authorization: Bearer <token>
```

---

## Sample SQL Queries

### Query 1: Find all parts from a specific supplier
```sql
SELECT DISTINCT 
  part_name,
  supplier_name,
  COUNT(DISTINCT uid) as total_uids,
  COUNT(DISTINCT work_order_number) as used_in_assemblies
FROM uid_traceability_report
WHERE supplier_name = 'ABC Suppliers'
  AND tenant_id = 'your-tenant-id'
GROUP BY part_name, supplier_name;
```

### Query 2: Track where a GRN was used
```sql
SELECT 
  uid,
  part_name,
  level,
  usage_type,
  assembly_name,
  work_order_number
FROM uid_traceability_report
WHERE grn_number = 'GRN-2025-001'
  AND tenant_id = 'your-tenant-id'
ORDER BY uid, level;
```

### Query 3: Multi-level assembly tracking
```sql
SELECT 
  uid,
  part_name,
  level,
  usage_type,
  assembly_name,
  array_to_string(work_order_path, ' → ') as assembly_path
FROM uid_traceability_report
WHERE level > 1  -- Only multi-level assemblies
  AND tenant_id = 'your-tenant-id'
ORDER BY level DESC, uid;
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    UID TRACEABILITY FLOW                    │
└─────────────────────────────────────────────────────────────┘

1. PURCHASE PATH:
   Vendor → PO → GRN → GRN Items → UID Registry
   
2. MANUFACTURING PATH:
   Job Order → Materials (from GRN/previous JO) → Produce Assembly → New UIDs
   
3. MULTI-LEVEL ASSEMBLY:
   Raw Material (Level 0)
      ↓ Used in WO-100
   Sub-Assembly 1 (Level 1)
      ↓ Used in WO-200
   Sub-Assembly 2 (Level 2)
      ↓ Used in WO-300
   Final Product (Level 3)
```

---

## Frontend Requirements (To Do)

### UID Traceability Page
**Route:** `/dashboard/uid/traceability`

**Features Needed:**
1. **Search Bar**
   - Search by UID, Part Code, GRN Number, Work Order Number
   - Auto-complete suggestions

2. **Filters**
   - Supplier dropdown
   - Date range (GRN Date, Work Order Date)
   - Assembly Level (0, 1, 2, 3+)
   - Product Category

3. **Results Table**
   Columns:
   - UID
   - Part Name
   - Supplier Name
   - Invoice No.
   - GRN No. & Date
   - Work Order No.
   - Assembly Name
   - Level
   - Usage Type

4. **Detail View**
   - Click UID → Show full hierarchy tree
   - Visual tree diagram of assembly levels
   - Timeline of manufacturing path

5. **Export Options**
   - Export to CSV
   - Export to Excel
   - Print report

6. **Statistics Dashboard**
   - Total UIDs tracked
   - UIDs from GRN vs Job Orders
   - Multi-level assemblies count
   - Top suppliers by UID count

---

## Testing Checklist

- [ ] Run SQL migration successfully
- [ ] Verify view `uid_traceability_report` exists
- [ ] Test `get_uid_traceability()` function
- [ ] Test `get_grn_uids_traceability()` function
- [ ] Test `get_work_order_material_traceability()` function
- [ ] Deploy API changes
- [ ] Test GET /uid/traceability/:uid endpoint
- [ ] Test GET /uid/traceability/grn/:grnNumber endpoint
- [ ] Test GET /uid/traceability/work-order/:workOrderNumber endpoint
- [ ] Test filtered report with pagination
- [ ] Test CSV export
- [ ] Verify multi-level assembly tracking works
- [ ] Check performance with large datasets

---

## Database Schema Requirements

Ensure these tables/columns exist:

**Tables:**
- `uid_registry` (id, uid, item_id, grn_item_id, job_order_id, tenant_id)
- `grn_items` (id, grn_id, item_id, quantity_received)
- `grns` (id, grn_number, grn_date, invoice_number, invoice_date, vendor_id, tenant_id)
- `vendors` (id, vendor_code, vendor_name, gst_number)
- `production_job_orders` (id, job_order_number, item_id, status, quantity, start_date, completion_date, tenant_id)
- `job_order_materials` (id, job_order_id, source_job_order_id)
- `items` (id, item_code, item_name, product_category, specifications)

**Missing Columns?**
If `job_order_materials.source_job_order_id` doesn't exist, run:
```sql
ALTER TABLE job_order_materials 
ADD COLUMN IF NOT EXISTS source_job_order_id UUID REFERENCES production_job_orders(id);
```

---

## Support & Troubleshooting

### Issue: View doesn't show any data
**Solution:** Ensure UIDs have proper relationships:
```sql
SELECT 
  COUNT(*) as total_uids,
  COUNT(grn_item_id) as with_grn,
  COUNT(job_order_id) as with_job_order
FROM uid_registry
WHERE tenant_id = 'your-tenant-id';
```

### Issue: Multi-level tracking not working
**Solution:** Verify `job_order_materials` table has source relationships:
```sql
SELECT 
  jo.job_order_number,
  source_jo.job_order_number as source
FROM job_order_materials jom
JOIN production_job_orders jo ON jom.job_order_id = jo.id
LEFT JOIN production_job_orders source_jo ON jom.source_job_order_id = source_jo.id
LIMIT 10;
```

### Issue: Slow performance
**Solution:** Check indexes are created:
```sql
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('uid_registry', 'grn_items', 'job_order_materials')
ORDER BY tablename, indexname;
```

---

## Next Steps

1. ✅ Run `add-uid-traceability-report.sql` in Supabase
2. ✅ Deploy API changes
3. 📝 Create frontend traceability page
4. 📝 Add Excel export functionality
5. 📝 Create visual tree diagram component
6. 📝 Add dashboard statistics
7. 📝 Implement real-time updates

---

**Ready to deploy? Run the SQL migration first, then deploy the API!**
