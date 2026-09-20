# PR/PO Enhancement Features - Implementation Guide

**Date:** January 6, 2026  
**Migration File:** `add-pr-po-enhancements.sql`

---

## 🎯 Features Implemented

### 1. **Running Serial Numbers**
- ✅ Auto-increment serial numbers for PR line items (1, 2, 3...)
- ✅ Auto-increment serial numbers for PO line items (1, 2, 3...)
- ✅ Serial numbers reset for each PR/PO document
- ✅ Backfilled existing records with serial numbers

**Database Changes:**
- Added `serial_no` column to `purchase_requisition_items`
- Added `serial_no` column to `purchase_order_items`
- Created triggers for automatic serial number generation

---

### 2. **UOM (Unit of Measurement)**
- ✅ UOM field added to PR items
- ✅ UOM field added to PO items
- ✅ Supports: Nos, Kg, Meter, Liter, Box, Set, etc.

**Database Changes:**
- Added `uom VARCHAR(20)` to `purchase_requisition_items`
- Added `uom VARCHAR(20)` to `purchase_order_items`

---

### 3. **Edit Tracking & History**
- ✅ Track PR edits with counter and timestamp
- ✅ Track PO edits with counter and timestamp
- ✅ Record who made the edits (`updated_by` field)
- ✅ Automatic edit count increment on updates

**Database Changes:**
- Added `updated_by`, `edit_count`, `last_edited_at` to `purchase_requisitions`
- Added `updated_by`, `edit_count`, `last_edited_at` to `purchase_orders`
- Created triggers to auto-track edits

**Edit Levels Supported:**
- ✅ **PR Header Level**: Edit department, priority, dates, notes
- ✅ **PR Line-Item Level**: Edit quantities, prices, specifications
- ✅ **PO Header Level**: Edit vendor, dates, payment terms
- ✅ **PO Line-Item Level**: Edit quantities, prices, delivery dates

---

### 4. **RFQ Multi-Vendor Support**
- ✅ Send RFQ to multiple vendors simultaneously
- ✅ Track which vendors received which items
- ✅ Per-item vendor selection
- ✅ RFQ tracking table with status

**Database Changes:**
- Created `pr_item_rfq_vendors` table (many-to-many mapping)
- Created `rfqs` table (RFQ master with status tracking)
- Created `rfq_items` table (RFQ line items with vendor quotes)

**RFQ Workflow:**
1. Select PR items
2. Assign multiple vendors per item
3. Send RFQ emails to all selected vendors
4. Track vendor responses and quotes
5. Compare quotes and select best vendor

---

### 5. **Partial PO Creation**
- ✅ Create partial PO from PR (order only some items)
- ✅ Track remaining quantities to be ordered
- ✅ Create multiple POs from same PR
- ✅ Automatic conversion status tracking

**Database Changes:**
- Added `pr_id` to `purchase_orders` (link PO to PR)
- Added `is_partial_po` flag to `purchase_orders`
- Added `partial_po_sequence` to track 1st, 2nd, 3rd PO
- Added `total_ordered_qty`, `remaining_qty`, `po_conversion_status` to `purchase_requisition_items`
- Added `pr_item_id` to `purchase_order_items` (track which PR item)
- Created trigger to auto-update ordered quantities

**Conversion Status:**
- `PENDING`: No PO created yet
- `PARTIAL`: Some quantity ordered, balance remaining
- `COMPLETED`: Full quantity ordered

**Features:**
- Create balance PO later
- Issue PO in multiple parts
- Track total ordered vs. requested quantity
- View remaining quantities

---

### 6. **Preferred Vendor & PO Sorting**
- ✅ Set preferred vendor per item in Items Master
- ✅ Auto-sort PO items by preferred vendor
- ✅ Group items by vendor for easy PO creation
- ✅ Vendor sort priority field

**Database Changes:**
- Added `preferred_vendor_id` to `items` table
- Added `vendor_sort_priority` to `items` table
- Created indexes for performance

**Benefits:**
- Faster PO creation
- Group items by supplier
- Reduce split POs
- Preferred pricing visibility

---

## 📊 Database Schema Summary

### New Tables Created

#### 1. `pr_item_rfq_vendors`
```sql
id                UUID (PK)
pr_item_id        UUID (FK to purchase_requisition_items)
vendor_id         UUID (FK to vendors)
created_at        TIMESTAMPTZ
```

#### 2. `rfqs`
```sql
id                UUID (PK)
tenant_id         UUID (FK to tenants)
pr_id             UUID (FK to purchase_requisitions)
rfq_number        VARCHAR(50) UNIQUE
vendor_id         UUID (FK to vendors)
sent_at           TIMESTAMPTZ
response_deadline DATE
status            VARCHAR(20) -- SENT, RECEIVED, EXPIRED, CONVERTED
vendor_quote_received_at  TIMESTAMPTZ
notes             TEXT
created_by        UUID (FK to users)
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

#### 3. `rfq_items`
```sql
id                      UUID (PK)
rfq_id                  UUID (FK to rfqs)
pr_item_id              UUID (FK to purchase_requisition_items)
item_code               VARCHAR(50)
item_name               VARCHAR(200)
requested_qty           DECIMAL(12,2)
uom                     VARCHAR(20)
vendor_quoted_price     DECIMAL(15,2)
vendor_quoted_lead_time INTEGER (days)
vendor_notes            TEXT
created_at              TIMESTAMPTZ
```

### Modified Tables

#### `purchase_requisition_items`
**New Columns:**
- `serial_no` - Running number (1, 2, 3...)
- `uom` - Unit of measurement
- `total_ordered_qty` - Total quantity ordered across all POs
- `remaining_qty` - Quantity left to order
- `po_conversion_status` - PENDING/PARTIAL/COMPLETED
- `updated_at`, `updated_by` - Edit tracking

#### `purchase_order_items`
**New Columns:**
- `serial_no` - Running number (1, 2, 3...)
- `uom` - Unit of measurement
- `pr_item_id` - Link to PR item
- `updated_at`, `updated_by` - Edit tracking

#### `purchase_requisitions`
**New Columns:**
- `updated_by` - User who last edited
- `edit_count` - Number of edits
- `last_edited_at` - Timestamp of last edit

#### `purchase_orders`
**New Columns:**
- `pr_id` - Link to source PR
- `updated_by` - User who last edited
- `edit_count` - Number of edits
- `last_edited_at` - Timestamp of last edit
- `is_partial_po` - Flag for partial PO
- `parent_pr_id` - Parent PR reference
- `partial_po_sequence` - Sequence number (1, 2, 3...)

#### `items`
**New Columns:**
- `preferred_vendor_id` - Preferred vendor for this item
- `vendor_sort_priority` - Sort order for vendor grouping

---

## 🗄️ Views Created

### `v_pr_items_with_po_status`
Comprehensive view showing:
- PR item details
- Total ordered quantity
- Remaining quantity
- Order status (NOT_ORDERED, PARTIALLY_ORDERED, FULLY_ORDERED)
- Preferred vendor information

**Usage Example:**
```sql
SELECT * FROM v_pr_items_with_po_status
WHERE pr_number = 'PR-2026-01-001'
ORDER BY serial_no;
```

---

## 🔄 Triggers Created

### 1. `trigger_set_pr_item_serial_no`
Auto-generates serial numbers for PR items on INSERT

### 2. `trigger_set_po_item_serial_no`
Auto-generates serial numbers for PO items on INSERT

### 3. `trigger_update_pr_item_remaining_qty`
Auto-calculates remaining quantity when ordered quantity changes

### 4. `trigger_track_pr_edits`
Increments edit counter and updates last_edited_at on PR updates

### 5. `trigger_track_po_edits`
Increments edit counter and updates last_edited_at on PO updates

### 6. `trigger_update_pr_item_ordered_qty`
Updates total_ordered_qty when PO items are created/updated/deleted

---

## 🚀 Migration Steps

### Step 1: Run Database Migration

Open Supabase SQL Editor and run:
```sql
-- Copy entire contents of add-pr-po-enhancements.sql
-- Paste in Supabase SQL Editor
-- Execute
```

**Expected Result:**
```
PR/PO Enhancement Migration completed successfully!

metric                    | value
--------------------------+------
PR Items Count            | (your count)
PO Items Count            | (your count)
RFQ Vendors Mappings      | 0
RFQs Created              | 0
```

### Step 2: Verify Migration

Check that all columns exist:
```sql
-- Check PR items
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'purchase_requisition_items'
AND column_name IN ('serial_no', 'uom', 'total_ordered_qty', 'remaining_qty', 'po_conversion_status');

-- Check PO items
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'purchase_order_items'
AND column_name IN ('serial_no', 'uom', 'pr_item_id');

-- Check new tables
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('pr_item_rfq_vendors', 'rfqs', 'rfq_items');
```

### Step 3: Verify Serial Numbers

Check that existing records have serial numbers:
```sql
-- PR items should have serial_no
SELECT pr_id, COUNT(*) as item_count, 
       MIN(serial_no) as min_serial, MAX(serial_no) as max_serial
FROM purchase_requisition_items
GROUP BY pr_id
LIMIT 10;

-- PO items should have serial_no  
SELECT po_id, COUNT(*) as item_count,
       MIN(serial_no) as min_serial, MAX(serial_no) as max_serial
FROM purchase_order_items
GROUP BY po_id
LIMIT 10;
```

---

## 📝 Usage Examples

### Example 1: Create PR with Serial Numbers and UOM

```typescript
const prData = {
  department: 'Production',
  requiredDate: '2026-02-01',
  priority: 'HIGH',
  items: [
    {
      itemCode: 'STEEL-001',
      itemName: 'Steel Sheet 2mm',
      uom: 'KG',              // ← New: UOM field
      requestedQty: 500,
      estimatedRate: 75.50,
      remarks: 'For Q1 production'
    },
    {
      itemCode: 'BOLT-M8',
      itemName: 'M8 Hex Bolt',
      uom: 'Nos',             // ← New: UOM field
      requestedQty: 1000,
      estimatedRate: 2.50,
      remarks: 'Standard grade 8.8'
    }
  ]
};

// Serial numbers will auto-generate: Item 1 = serial_no: 1, Item 2 = serial_no: 2
```

### Example 2: Send RFQ to Multiple Vendors (Per Item)

```typescript
// Frontend: User selects vendors for each item
const rfqData = {
  prId: 'pr-uuid-here',
  itemVendors: [
    {
      prItemId: 'item-1-uuid',
      itemCode: 'STEEL-001',
      itemName: 'Steel Sheet 2mm',
      quantity: 500,
      vendorIds: ['vendor-a-uuid', 'vendor-b-uuid', 'vendor-c-uuid'] // Multiple vendors
    },
    {
      prItemId: 'item-2-uuid',
      itemCode: 'BOLT-M8',
      itemName: 'M8 Hex Bolt',
      quantity: 1000,
      vendorIds: ['vendor-d-uuid', 'vendor-e-uuid'] // Different vendors
    }
  ],
  responseDeadline: '2026-01-15',
  remarks: 'Please provide best price and lead time'
};

// Each vendor receives RFQ with only their assigned items
```

### Example 3: Create Partial PO

```typescript
// User creates PO for only some items from PR
const partialPOData = {
  prId: 'pr-uuid-here',
  vendorId: 'vendor-a-uuid',
  items: [
    {
      prItemId: 'item-1-uuid',  // Link to PR item
      itemId: 'steel-001-id',
      quantity: 200,             // Only 200 out of 500 requested
      unitPrice: 72.00,
      uom: 'KG'
    }
    // Intentionally NOT ordering BOLT-M8 yet
  ]
};

// After PO creation:
// PR Item 1: total_ordered_qty = 200, remaining_qty = 300, status = PARTIAL
// PR Item 2: total_ordered_qty = 0, remaining_qty = 1000, status = PENDING
```

### Example 4: Create Balance PO

```typescript
// Later, user creates PO for remaining items
const balancePOData = {
  prId: 'same-pr-uuid',
  vendorId: 'vendor-b-uuid',
  items: [
    {
      prItemId: 'item-1-uuid',
      itemId: 'steel-001-id',
      quantity: 300,            // Balance quantity
      unitPrice: 74.00,
      uom: 'KG'
    },
    {
      prItemId: 'item-2-uuid',
      itemId: 'bolt-m8-id',
      quantity: 1000,           // Full quantity
      unitPrice: 2.30,
      uom: 'Nos'
    }
  ]
};

// After this PO:
// PR Item 1: total_ordered_qty = 500, remaining_qty = 0, status = COMPLETED
// PR Item 2: total_ordered_qty = 1000, remaining_qty = 0, status = COMPLETED
```

### Example 5: Query PR Items with PO Status

```sql
-- View all items with their order status
SELECT 
  pr_number,
  serial_no,
  item_code,
  item_name,
  uom,
  requested_qty,
  ordered_qty,
  pending_qty,
  order_status,
  preferred_vendor_name
FROM v_pr_items_with_po_status
WHERE pr_number = 'PR-2026-01-001'
ORDER BY serial_no;
```

Result:
```
pr_number        | serial_no | item_code  | uom | requested_qty | ordered_qty | pending_qty | order_status      | preferred_vendor
-----------------|-----------|-----------+-----+---------------+-------------+-------------+-------------------+-----------------
PR-2026-01-001   | 1         | STEEL-001  | KG  | 500           | 200         | 300         | PARTIALLY_ORDERED | ABC Steel Co
PR-2026-01-001   | 2         | BOLT-M8    | Nos | 1000          | 0           | 1000        | NOT_ORDERED       | Fasteners Inc
```

---

## 🔍 Frontend Integration Points

### PR Page Updates Needed

1. **Add Serial No Column**
   ```tsx
   <th>S.No</th>
   ...
   <td>{item.serial_no || index + 1}</td>
   ```

2. **Add UOM Field**
   ```tsx
   <input
     type="text"
     value={item.uom || ''}
     placeholder="e.g., Nos, Kg, Meter"
     onChange={(e) => updateItem(item.id, { uom: e.target.value })}
   />
   ```

3. **Edit Button at Line Level**
   ```tsx
   <button onClick={() => handleEditItem(item.id)}>
     ✏️ Edit Item
   </button>
   ```

4. **Multi-Vendor RFQ Selection**
   ```tsx
   {items.map(item => (
     <div key={item.id}>
       <p>{item.itemName}</p>
       <MultiSelect
         options={vendors}
         value={item.selectedVendors}
         onChange={(vendors) => setItemVendors(item.id, vendors)}
       />
     </div>
   ))}
   ```

### PO Page Updates Needed

1. **Add Serial No Column**
   ```tsx
   <th>S.No</th>
   ...
   <td>{item.serial_no || index + 1}</td>
   ```

2. **Sort by Preferred Vendor**
   ```tsx
   const sortedItems = items.sort((a, b) => {
     return (a.preferred_vendor_priority || 999) - (b.preferred_vendor_priority || 999);
   });
   ```

3. **Show Remaining Qty from PR**
   ```tsx
   {item.pr_item_id && (
     <small className="text-gray-600">
       PR Requested: {item.pr_requested_qty} | 
       Already Ordered: {item.total_ordered_qty} |
       Remaining: {item.remaining_qty}
     </small>
   )}
   ```

4. **Partial PO Indicator**
   ```tsx
   {formData.isPartialPO && (
     <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
       ⚠️ This is Partial PO #{formData.partialSequence} from PR {formData.prNumber}
       <br />
       You can create additional POs for remaining items later.
     </div>
   )}
   ```

---

## ✅ Testing Checklist

### Serial Numbers
- [ ] Create new PR with 3 items → Verify serial_no = 1, 2, 3
- [ ] Edit PR and add 2 more items → Verify serial_no = 4, 5
- [ ] Create new PO with 4 items → Verify serial_no = 1, 2, 3, 4

### UOM
- [ ] Create PR item with UOM = "Kg" → Verify saved correctly
- [ ] Create PO item with UOM = "Nos" → Verify saved correctly
- [ ] View PR/PO list → Verify UOM displays in tables

### Edit Tracking
- [ ] Create PR → Check edit_count = 0
- [ ] Edit PR header → Check edit_count = 1, last_edited_at updated
- [ ] Edit PR item → Check edit_count = 2
- [ ] Create PO → Check edit_count = 0
- [ ] Edit PO → Check edit_count incremented

### RFQ Multi-Vendor
- [ ] Select PR with 3 items
- [ ] Assign Vendor A, B to Item 1
- [ ] Assign Vendor C to Item 2
- [ ] Assign Vendor A, C, D to Item 3
- [ ] Send RFQ → Verify 4 emails sent with correct items

### Partial PO
- [ ] Create PR with 5 items
- [ ] Create PO with only 3 items (partial)
- [ ] Check PR items: 3 should show PARTIAL or COMPLETED, 2 should show PENDING
- [ ] Create 2nd PO with remaining 2 items
- [ ] Check PR items: All should show COMPLETED

### Vendor Sorting
- [ ] Set preferred vendor for Item A = Vendor X
- [ ] Set preferred vendor for Item B = Vendor Y
- [ ] Set preferred vendor for Item C = Vendor X
- [ ] Create PO from PR → Items should group by vendor (A, C together, then B)

---

## 🆘 Troubleshooting

### Issue: Serial numbers not generating

**Solution:**
```sql
-- Manually trigger serial number generation
SELECT set_pr_item_serial_no() FROM purchase_requisition_items WHERE serial_no IS NULL;
SELECT set_po_item_serial_no() FROM purchase_order_items WHERE serial_no IS NULL;
```

### Issue: Remaining quantity not updating

**Solution:**
```sql
-- Manually recalculate remaining quantities
UPDATE purchase_requisition_items
SET remaining_qty = requested_qty - COALESCE(total_ordered_qty, 0),
    po_conversion_status = CASE
      WHEN COALESCE(total_ordered_qty, 0) >= requested_qty THEN 'COMPLETED'
      WHEN COALESCE(total_ordered_qty, 0) > 0 THEN 'PARTIAL'
      ELSE 'PENDING'
    END;
```

### Issue: Edit counter not incrementing

**Solution:**
```sql
-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_track_pr_edits';

-- If missing, re-run migration file
```

---

## 📚 Additional Resources

- [Database Schema Documentation](./database-schema.sql)
- [PR API Endpoints](./apps/api/src/purchase/controllers/purchase-requisitions.controller.ts)
- [PO API Endpoints](./apps/api/src/purchase/controllers/purchase-orders.controller.ts)
- [Frontend PR Page](./apps/web/src/app/dashboard/purchase/requisitions/page.tsx)
- [Frontend PO Page](./apps/web/src/app/dashboard/purchase/orders/page.tsx)

---

## 🎉 Summary

This enhancement adds **enterprise-grade procurement features** to your ERP:

✅ **Better Organization**: Serial numbers make line items easy to reference  
✅ **Clear Units**: UOM field ensures no confusion about quantities  
✅ **Edit History**: Track all changes with audit trail  
✅ **Flexible Ordering**: Partial POs allow phased procurement  
✅ **Vendor Competition**: Multi-vendor RFQs get you best prices  
✅ **Smart Sorting**: Auto-group items by preferred vendor  

**Next Step:** Run the migration and update your frontend! 🚀
