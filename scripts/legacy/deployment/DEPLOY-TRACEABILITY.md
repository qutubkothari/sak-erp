# UID TRACEABILITY ENHANCEMENT - DEPLOYMENT

## What's New?

Your existing UID trace page (`/dashboard/uid/trace`) will be enhanced with:

✅ **Supplier Invoice Number** - Track exact invoice from vendor  
✅ **Work Order Tracking** - See which assemblies use this part  
✅ **Multi-Level Assemblies** - Track sub-assembly of sub-assembly  
✅ **Complete Supply Chain** - From supplier to final product  

---

## Step 1: Run SQL Migration

**Open Supabase SQL Editor** and run this file:
```
add-uid-traceability-report.sql
```

This creates:
- `uid_traceability_report` view
- `get_uid_traceability()` function
- `get_grn_uids_traceability()` function
- `get_work_order_material_traceability()` function
- Performance indexes

**Expected Output:**
```
✅ UID Traceability System Created Successfully!

Available Functions:
1. get_uid_traceability(uid, tenant_id) - Full traceability for one UID
2. get_grn_uids_traceability(grn_number, tenant_id) - All UIDs from a GRN
3. get_work_order_material_traceability(work_order_number, tenant_id) - Materials in work order

Views:
1. uid_traceability_report - Complete traceability for all UIDs

Features:
✓ Part Name & Code
✓ Supplier Name & Invoice Number
✓ GRN Number & Date
✓ Work Order for Sub-Assembly
✓ Multi-level Sub-Assembly Tracking
```

---

## Step 2: Deploy API Changes

```bash
.\deploy-hostinger.ps1
```

New files deployed:
- `apps/api/src/uid/traceability.controller.ts` ✅ Already created
- `apps/api/src/uid/traceability.service.ts` ✅ Already created
- `apps/api/src/uid/uid.module.ts` ✅ Already updated

---

## Step 3: Test Your Existing Page

Your **existing UID trace page** at `/dashboard/uid/trace` will now show:

### NEW FIELDS AVAILABLE:

1. **Invoice Information**
   - Invoice Number (from GRN)
   - Invoice Date

2. **Work Order Section** (NEW!)
   - Work Order Number (if part used in assembly)
   - Assembly Name
   - Assembly Status
   - Assembly Dates

3. **Multi-Level Assembly Tree** (NEW!)
   ```
   Raw Material (Level 0)
      ↓ Used in WO-100
   Sub-Assembly (Level 1)
      ↓ Used in WO-200
   Final Product (Level 2)
   ```

---

## What You Need to Do in Frontend

The endpoint `/api/v1/uid/traceability/:uid` is ready!

**Option A: Add to existing trace page** (Recommended)

Add this section to `apps/web/src/app/dashboard/uid/trace/page.tsx`:

```tsx
{/* NEW: Work Order Usage Section */}
{traceData.work_orders && traceData.work_orders.length > 0 && (
  <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
    <h2 className="text-xl font-bold text-gray-800 mb-4">🏭 Assembly Usage</h2>
    <p className="text-sm text-gray-600 mb-4">
      This part was used in the following assemblies:
    </p>
    
    <div className="space-y-4">
      {traceData.work_orders.map((wo, index) => (
        <div key={index} className="border-l-4 border-orange-500 pl-4 py-3 bg-orange-50 rounded">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-bold text-gray-800">{wo.work_order_number}</p>
              <p className="text-sm text-gray-600">Level {wo.level} - {wo.usage_type}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(wo.work_order_status)}`}>
              {wo.work_order_status}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-xs text-gray-500">Assembly</p>
              <p className="font-semibold">{wo.assembly_name}</p>
              <p className="text-xs text-gray-600">{wo.assembly_item_code}</p>
            </div> 
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-sm">{formatDate(wo.work_order_completion_date)}</p>
            </div>
          </div>
          
          {wo.level > 0 && (
            <div className="mt-3 pt-3 border-t border-orange-200">
              <p className="text-xs text-gray-500">Assembly Path</p>
              <p className="text-xs font-mono text-gray-700">
                {wo.work_order_path.join(' → ')}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

**Option B: Call new traceability endpoint**

Change the fetch in your trace page from:
```typescript
// OLD
const response = await fetch(`/api/v1/uid/trace/${uid}`, ...);
```

To:
```typescript
// NEW - Enhanced traceability
const response = await fetch(`/api/v1/uid/traceability/${uid}`, ...);
```

---

## Testing Checklist

After deployment, test with a UID that has been used in assemblies:

- [ ] Search for a UID on `/dashboard/uid/trace`
- [ ] Verify Invoice Number shows (if from GRN)
- [ ] Check "Assembly Usage" section appears (if used in work orders)
- [ ] Verify multi-level assembly path shows correctly
- [ ] Click through assembly hierarchy
- [ ] Export CSV from `/api/v1/uid/traceability/export?format=csv`

---

## Sample API Response

```bash
GET /api/v1/uid/traceability/UID-12345
```

**Response:**
```json
[
  {
    "uid": "UID-12345",
    "part_code": "PART-001",
    "part_name": "Electronic Component",
    "supplier_name": "ABC Suppliers",
    "supplier_code": "SUPP-001",
    "invoice_number": "INV-2025-001",
    "invoice_date": "2025-01-10",
    "grn_number": "GRN-2025-001",
    "grn_date": "2025-01-15",
    "level": 0,
    "usage_type": "Raw Material / Purchased Part",
    "work_order_number": null,
    "assembly_name": null
  },
  {
    "uid": "UID-12345",
    "work_order_number": "WO-2025-100",
    "work_order_status": "COMPLETED",
    "assembly_item_code": "ASM-100",
    "assembly_name": "Control Module",
    "level": 1,
    "usage_type": "Used in Sub-Assembly",
    "work_order_path": ["WO-2025-100"]
  },
  {
    "uid": "UID-12345",
    "work_order_number": "WO-2025-200",
    "assembly_name": "Main System",
    "level": 2,
    "usage_type": "Used in Sub-Assembly of Sub-Assembly",
    "work_order_path": ["WO-2025-100", "WO-2025-200"]
  }
]
```

---

## Need Help?

**Migration Not Working?**
```sql
-- Check if function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'get_uid_traceability';

-- Check if view exists
SELECT table_name FROM information_schema.views 
WHERE table_name = 'uid_traceability_report';
```

**No Data Showing?**
Check if UIDs have relationships:
```sql
SELECT 
  uid,
  item_id IS NOT NULL as has_item,
  grn_item_id IS NOT NULL as from_grn,
  job_order_id IS NOT NULL as from_job_order
FROM uid_registry
LIMIT 10;
```

**
Multi-level Not Working?**
Verify job_order_materials table:
```sql
SELECT COUNT(*) FROM job_order_materials 
WHERE source_job_order_id IS NOT NULL;
```

---

## What's Next?

After this works, you can add:

1. **📊 Dashboard Widget** - Show assembly usage statistics
2. **📦 Batch Reports** - Trace entire GRN at once
3. **🔍 Advanced Search** - Filter by supplier, work order, level
4. **📈 Analytics** - Track which parts are used in most assemblies
5. **📤 Excel Export** - Download full traceability reports

---

**Ready to deploy?**  
1. Run SQL migration ✅  
2. Deploy API ✅  
3. Your existing page automatically gets new data! 🎉
