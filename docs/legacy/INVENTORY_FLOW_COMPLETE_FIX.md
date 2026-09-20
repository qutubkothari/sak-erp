# COMPLETE INVENTORY FLOW FIX
## Critical Issues Identified & Solutions

---

## 🔴 CRITICAL ISSUES FOUND

### 1. **TABLE NAMING CONFLICT: `grn` vs `grns`**
- **Migration files** create table named: `grn`
- **database-schema.sql** defines table named: `grns`
- **Code (grn.service.ts)** queries: `grn`
- **Result**: Code and schema are misaligned!

### 2. **MISSING STATUS COLUMN IN GRN TABLE**
- Code tries to update `status` column
- Status column may not exist depending on which migration ran
- **Impact**: GRN approval fails → No stock entries created → Empty inventory

### 3. **PRODUCTION SERVICE USES WRONG TABLE**
- production.service.ts queries `from('inventory')` 
- **This table doesn't exist!**
- Should use: `stock_entries`
- **Impact**: Production fails when consuming materials

### 4. **SALES DISPATCH NEVER REDUCES STOCK** 🚨
- sales.service.ts `createDispatch()` method:
  - ✅ Creates dispatch note
  - ✅ Creates warranties
  - ❌ **NEVER reduces stock_entries**
- **Impact**: Sales happen but inventory never decreases!

---

## 📊 CORRECT INVENTORY FLOW

```
┌─────────────────────────────────────────────────────────────┐
│                    INVENTORY LIFECYCLE                       │
└─────────────────────────────────────────────────────────────┘

1. GRN RECEIPT (Stock ↑)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   User creates GRN → User approves GRN
   → grn.service.ts.updateStatus('APPROVED')
   → calls createStockEntry()
   → INSERT INTO stock_entries
   ✅ Stock increases

2. PRODUCTION (Raw Material ↓, Finished Goods ↑)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Production order created → Materials consumed
   → production.service.ts reduces raw material stock
   → production.service.ts increases finished goods stock
   ✅ Stock rebalanced

3. SALES DISPATCH (Stock ↓)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Dispatch created → Items shipped
   → sales.service.ts.createDispatch()
   → ❌ MISSING: Reduce stock_entries
   → ❌ MISSING: Create stock_movements record
   ⚠️  Stock not reduced!

4. PURCHASE RETURN (Stock ↓)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Return to vendor → Material removed
   → ❓ Service not implemented yet
   → Should reduce stock_entries

5. CUSTOMER RETURN (Stock ↑)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Customer returns goods → Material back in warehouse
   → ❓ Service not implemented yet
   → Should increase stock_entries
```

---

## 🔧 REQUIRED FIXES

### **STEP 1: Run Diagnostic SQL**
```bash
# Run this in Supabase SQL Editor:
# c:\Users\musta\OneDrive\Documents\GitHub\Manufacturing ERP\DIAGNOSE_INVENTORY_ISSUE.sql
```

This will tell you:
- Does `grn` or `grns` table exist (or both)?
- Does status column exist?
- What's the current data state?

### **STEP 2: Fix Table Naming**

**Option A: If `grn` table exists** (most likely from migrations)
```sql
-- Add status column if missing
ALTER TABLE grn 
ADD COLUMN IF NOT EXISTS status grn_status DEFAULT 'DRAFT';

-- No code changes needed - code already uses 'grn'
```

**Option B: If `grns` table exists** (from main schema)
```typescript
// Fix all references in grn.service.ts
// Change:  .from('grn')
// To:      .from('grns')
```

**Option C: If BOTH exist** 😱
```sql
-- Consolidate to grns (schema standard)
-- 1. Copy data from grn to grns
INSERT INTO grns SELECT * FROM grn;

-- 2. Drop old table
DROP TABLE grn CASCADE;

-- 3. Fix grn_items foreign key
ALTER TABLE grn_items 
DROP CONSTRAINT IF EXISTS grn_items_grn_id_fkey,
ADD CONSTRAINT grn_items_grns_id_fkey 
  FOREIGN KEY (grn_id) REFERENCES grns(id) ON DELETE CASCADE;
```

Then update code to use `grns`.

### **STEP 3: Fix Production Service**

**File**: `apps/api/src/production/services/production.service.ts`

**Changes needed** (5 locations around lines 304, 313, 341, 350, 360):

```typescript
// WRONG:
.from('inventory')

// CORRECT:
.from('stock_entries')
```

**Also update the queries:**
```typescript
// OLD CODE (lines 304-324):
const { data: invData } = await this.supabase
  .from('inventory')  // ❌ WRONG
  .select('quantity')
  .eq('tenant_id', tenantId)
  .eq('item_id', uid.entity_id)
  .single();

if (invData && invData.quantity > 0) {
  await this.supabase
    .from('inventory')  // ❌ WRONG
    .update({
      quantity: invData.quantity - 1,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('item_id', uid.entity_id);
}

// NEW CODE:
const { data: stockData } = await this.supabase
  .from('stock_entries')  // ✅ CORRECT
  .select('available_quantity, warehouse_id')
  .eq('tenant_id', tenantId)
  .eq('item_id', uid.entity_id)
  .maybeSingle();

if (stockData && stockData.available_quantity > 0) {
  await this.supabase
    .from('stock_entries')  // ✅ CORRECT
    .update({
      available_quantity: stockData.available_quantity - 1,
      quantity: stockData.quantity - 1,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('item_id', uid.entity_id)
    .eq('warehouse_id', stockData.warehouse_id);
}
```

### **STEP 4: Add Stock Reduction to Sales Dispatch** 🎯

**File**: `apps/api/src/sales/services/sales.service.ts`

**Add this function after `createDispatch` method:**

```typescript
private async reduceStockForDispatch(
  tenantId: string, 
  dispatchItems: any[], 
  dispatchNumber: string
) {
  for (const item of dispatchItems) {
    // Get current stock
    const { data: stockEntry } = await this.supabase
      .from('stock_entries')
      .select('quantity, available_quantity')
      .eq('tenant_id', tenantId)
      .eq('item_id', item.item_id)
      .maybeSingle();

    if (!stockEntry) {
      throw new BadRequestException(
        `No stock available for item ${item.item_id}`
      );
    }

    if (stockEntry.available_quantity < item.quantity) {
      throw new BadRequestException(
        `Insufficient stock for item ${item.item_id}. ` +
        `Available: ${stockEntry.available_quantity}, Required: ${item.quantity}`
      );
    }

    // Reduce stock
    await this.supabase
      .from('stock_entries')
      .update({
        quantity: stockEntry.quantity - item.quantity,
        available_quantity: stockEntry.available_quantity - item.quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('item_id', item.item_id);

    // Create stock movement record
    await this.supabase
      .from('stock_movements')
      .insert({
        tenant_id: tenantId,
        movement_type: 'OUTBOUND',
        item_id: item.item_id,
        uid: item.uid,
        quantity: -item.quantity,
        reference_type: 'DISPATCH',
        reference_id: dispatchRecord.id,
        reference_number: dispatchNumber,
        notes: `Dispatched via ${dispatchNumber}`,
        movement_date: new Date().toISOString(),
      });
  }
}
```

**Update `createDispatch` method to call this:**

```typescript
async createDispatch(req: Request, dispatchData: any) {
  // ... existing code to create dispatch note and items ...

  // ✅ ADD THIS BEFORE creating warranties:
  await this.reduceStockForDispatch(
    tenantId, 
    dispatchData.items,
    dispatchRecord.dn_number
  );

  // Update sales order item dispatched quantities
  // ... rest of existing code ...
}
```

---

## 🧪 TESTING CHECKLIST

After implementing fixes, test this flow:

### **Test 1: GRN → Stock Creation**
```
1. Create GRN with items
2. Approve GRN (updateStatus('APPROVED'))
3. Verify: stock_entries has new records
4. Verify: UIDs created in uid_registry
```

### **Test 2: Production Consumption**
```
1. Create production order
2. Complete station
3. Verify: Raw material stock_entries.quantity reduced
4. Verify: Finished goods stock_entries.quantity increased
```

### **Test 3: Sales Dispatch**
```
1. Create sales order
2. Create dispatch note
3. ✅ NEW: Verify stock_entries.quantity reduced
4. ✅ NEW: Verify stock_movements record created
```

### **Test 4: End-to-End**
```
1. Create item (e.g., "Widget", stock = 0)
2. Create GRN with 100 units → Approve
   Expected: stock_entries shows 100
3. Create production order consuming 50 widgets
   Expected: stock_entries shows 50
4. Dispatch 30 units
   Expected: stock_entries shows 20
```

---

## 📋 IMPLEMENTATION ORDER

1. ✅ Run `DIAGNOSE_INVENTORY_ISSUE.sql` 
2. 🔧 Fix table naming (grn vs grns)
3. 🔧 Fix production service (inventory → stock_entries)
4. 🔧 Add stock reduction to sales dispatch
5. 🧪 Test each flow individually
6. 🧪 Test complete end-to-end flow

---

## 🚨 WHY THIS IS CRITICAL

**Current Broken State:**
```
GRN: 100 units received ✅
  → stock_entries: 100 ✅
  
Production: Used 50 units ❌ (queries wrong table)
  → stock_entries: Still 100 ❌
  
Sales: Dispatched 30 units ❌ (never reduces stock)
  → stock_entries: Still 100 ❌

Result: Inventory shows 100 when actually only 20 remain!
```

**After Fixes:**
```
GRN: 100 units received ✅
  → stock_entries: 100 ✅
  
Production: Used 50 units ✅
  → stock_entries: 50 ✅
  
Sales: Dispatched 30 units ✅
  → stock_entries: 20 ✅

Result: Accurate inventory tracking!
```

---

## 📁 FILES TO MODIFY

1. `apps/api/src/purchase/services/grn.service.ts` - Table name fix
2. `apps/api/src/production/services/production.service.ts` - Table reference fix
3. `apps/api/src/sales/services/sales.service.ts` - Add stock reduction

---

## ⚠️ IMPORTANT NOTES

- **Backup database** before running consolidation SQL
- Test on development environment first
- Sales dispatch fix will prevent dispatch if stock insufficient
- Consider adding transaction wrapper for atomicity
- Stock movements table should be created if it doesn't exist

---

**Ready to implement? Start with Step 1 (Diagnostic SQL)!**
