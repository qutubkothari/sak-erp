# Inventory Integration Implementation Guide

## Overview
This guide explains the complete inventory integration for Job Orders, including material checking before creation and automatic inventory updates on completion.

## What's Been Implemented

### 1. Material Availability Checking (Before Job Creation)
When creating a job order, the system now:
- ✅ Checks if sufficient materials are available in inventory
- ✅ Shows detailed shortage information if materials are insufficient
- ✅ Blocks job order creation if materials are not available

**Location**: `apps/api/src/production/services/job-order.service.ts`
- Method: `checkMaterialAvailability()` (lines 297-327)
- Called from: `create()` method (lines 21-28)

### 2. Inventory Updates on Job Completion
When completing a job order, the system:
- ✅ Consumes all required materials from inventory
- ✅ Adds finished goods to inventory
- ✅ Updates job order status to COMPLETED

**Locations**:
- Backend: `apps/api/src/production/services/job-order.service.ts`
  - Method: `completeJobOrder()` (lines 328-396)
- Backend: `apps/api/src/production/controllers/job-order.controller.ts`
  - Endpoint: `POST /job-orders/:id/complete` (added)
- Frontend: `apps/web/src/app/dashboard/production/job-orders/page.tsx`
  - Method: `handleCompleteJobOrder()` (added)
  - Complete button now calls this method instead of simple status update

### 3. Database Functions
Three Supabase RPC functions needed:
- `consume_inventory(tenant_id, item_id, quantity)` - Decreases available quantity
- `add_to_inventory(tenant_id, item_id, quantity)` - Increases available quantity
- `reserve_inventory(tenant_id, item_id, quantity)` - Reserves materials (future use)

**File**: `add-inventory-functions.sql`

## Setup Steps

### Step 1: Run Database Migration
1. Open Supabase Dashboard → SQL Editor
2. Open the file: `add-inventory-functions.sql`
3. Copy the entire SQL script
4. Paste into Supabase SQL Editor
5. Click "Run"
6. Verify success message: "✅ INVENTORY FUNCTIONS CREATED SUCCESSFULLY!"

### Step 2: Deploy Backend Changes
```powershell
# From project root
git add .
git commit -m "feat: Add inventory integration to job orders"
.\deploy-production.ps1
```

Or deploy manually:
```powershell
cd apps/api
pnpm install
pnpm run build
pm2 restart sak-api
```

### Step 3: Deploy Frontend Changes
```powershell
cd apps/web
pnpm install
pnpm run build
pm2 restart sak-web
```

## How It Works

### Material Checking Flow
1. User creates job order with materials
2. Backend calculates total required quantity: `requiredQuantity × jobQuantity`
3. Backend queries `inventory_stock` table for each material
4. If any material is insufficient:
   - Returns error with details: "Item XYZ: Need 100, Available 50, Short 50"
   - Job order is NOT created
5. If all materials sufficient:
   - Job order is created normally

### Job Completion Flow
1. User clicks "Complete" button on IN_PROGRESS job order
2. Frontend shows confirmation dialog
3. Frontend calls `POST /job-orders/:id/complete`
4. Backend:
   - Fetches job order with materials
   - For each material: calls `consume_inventory(tenant_id, item_id, quantity × job_quantity)`
   - Calls `add_to_inventory(tenant_id, finished_item_id, job_quantity)`
   - Updates job order status to COMPLETED
5. Frontend refreshes list and shows success message

### Error Handling
- **Material shortage on creation**: Shows detailed error with item names and shortage amounts
- **Material shortage on completion**: Should not happen (pre-checked), but RPC function will throw error
- **Item not in inventory**: RPC function throws "Item not found in inventory"
- **Database errors**: Rolled back (transactions preserved)

## Testing Scenarios

### Test 1: Create Job Order Without Sufficient Materials
1. Go to Job Orders page
2. Create a job order for a BOM item
3. Materials will auto-populate from BOM
4. If inventory doesn't have enough materials:
   - Error message appears: "Insufficient materials: [details]"
   - Job order is NOT created
5. Expected: Clear error message listing all shortages

### Test 2: Create Job Order With Sufficient Materials
1. Ensure inventory has enough materials
2. Create job order
3. Expected: Job order created successfully

### Test 3: Complete Job Order
1. Create a job order (status: DRAFT)
2. Click "Schedule" → status changes to SCHEDULED
3. Click "Start" → status changes to IN_PROGRESS
4. Click "Complete" → confirmation dialog appears
5. Confirm completion
6. Expected:
   - Job order status changes to COMPLETED
   - Materials consumed from inventory (check inventory_stock table)
   - Finished goods added to inventory (check inventory_stock table)
   - Success message displayed

### Test 4: Complete Job Without Sufficient Materials (Edge Case)
1. Create job order with sufficient materials
2. Start the job order
3. Manually decrease inventory (simulate someone else using materials)
4. Try to complete job order
5. Expected: Error message about insufficient materials

## Database Tables Used

### inventory_stock
- `tenant_id`: UUID
- `item_id`: UUID
- `available_quantity`: DECIMAL (checked before job creation, decreased on completion)
- `reserved_quantity`: DECIMAL (increased when job starts - future feature)
- `total_quantity`: DECIMAL (increased when finished goods added)

### production_job_orders
- `id`: UUID
- `tenant_id`: UUID
- `job_order_number`: VARCHAR (auto-generated)
- `item_id`: UUID (finished goods to produce)
- `quantity`: INTEGER (how many to produce)
- `status`: ENUM (DRAFT → SCHEDULED → IN_PROGRESS → COMPLETED)

### job_order_materials
- `job_order_id`: UUID
- `item_id`: UUID (raw material)
- `required_quantity`: DECIMAL (per unit)
- Total consumed = required_quantity × job_order.quantity

## Code References

### Backend Service Method Signatures
```typescript
// Check material availability (private method)
private async checkMaterialAvailability(
  tenantId: string,
  materials: Array<{itemId: string, requiredQuantity: number}>,
  jobQuantity: number
): Promise<{
  available: boolean;
  shortages: Array<{
    itemId: string;
    itemCode: string;
    itemName: string;
    required: number;
    available: number;
    shortage: number;
  }>;
}>

// Complete job order and update inventory
async completeJobOrder(tenantId: string, jobOrderId: string): Promise<JobOrder>
```

### Frontend API Calls
```typescript
// Complete job order
await apiClient.post(`/job-orders/${id}/complete`, {});
```

## Future Enhancements
- [ ] Material reservation when job starts (IN_PROGRESS)
- [ ] Partial material consumption tracking per operation
- [ ] Material return for canceled jobs
- [ ] Scrap/waste tracking during production
- [ ] Real-time inventory alerts
- [ ] Batch/lot number tracking for materials
- [ ] Quality inspection before adding to finished goods

## Troubleshooting

### Error: "Item not found in inventory"
**Cause**: Item exists in `items` table but not in `inventory_stock` table
**Solution**: Add initial stock record for the item

### Error: "Insufficient stock"
**Cause**: Not enough available quantity for materials
**Solution**: 
1. Add stock via GRN (Goods Receipt Note)
2. Or reduce job order quantity

### Error: "RPC function does not exist"
**Cause**: Database migration not run
**Solution**: Run `add-inventory-functions.sql` in Supabase

### Job order completes but inventory not updated
**Cause**: Database functions exist but have errors
**Solution**: 
1. Check Supabase logs
2. Test RPC functions manually:
```sql
SELECT consume_inventory('tenant-id'::uuid, 'item-id'::uuid, 10);
SELECT add_to_inventory('tenant-id'::uuid, 'item-id'::uuid, 5);
```

## Rollback Plan
If issues occur after deployment:

1. **Revert backend**:
```powershell
git revert HEAD
.\deploy-production.ps1
```

2. **Disable inventory checking** (temporary):
Comment out lines 21-28 in `job-order.service.ts`:
```typescript
// if (dto.materials && dto.materials.length > 0) {
//   const availability = await this.checkMaterialAvailability(...);
//   if (!availability.available) { throw ... }
// }
```

3. **Database functions** (keep them - they don't hurt):
No need to drop functions unless causing issues

## Success Criteria
- ✅ Cannot create job order without sufficient materials
- ✅ Error message clearly shows what's missing
- ✅ Completing job order consumes materials
- ✅ Completing job order adds finished goods
- ✅ Inventory quantities are accurate after operations
- ✅ No manual SQL needed for inventory updates

## Support
If you encounter issues:
1. Check Supabase logs for RPC function errors
2. Check browser console for frontend errors
3. Check PM2 logs: `pm2 logs sak-api`
4. Verify database functions exist:
```sql
SELECT * FROM pg_proc WHERE proname IN ('consume_inventory', 'add_to_inventory', 'reserve_inventory');
```
