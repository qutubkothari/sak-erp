# Quick Test Guide - Sales Order & Project Tracking

## Pre-Testing Setup

**Status Check** ✅
- Web Server: http://localhost:3000 (PID 12776)
- API Server: http://localhost:4000 (PID 23168)

**⚠️ IMPORTANT: Apply Database Migration First**
Before testing, you must apply the migration in Supabase:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `add-sales-order-project-tracking.sql`
4. Run in SQL editor
5. Verify "Migration completed successfully!" message

## Test 1: Direct Sales Order Creation

### Frontend Test
1. Navigate to: http://localhost:3000/dashboard/sales
2. Click "Orders" tab
3. Click "+ Create Direct Order" button
4. Fill form:
   - **Customer**: Select any customer from dropdown
   - **Source Type**: Choose "Direct Customer Order" or "Internal Stock"
   - **Order Date**: Today's date (pre-filled)
   - **Expected Delivery**: Future date
   - **Project**: Enter "Test Project Alpha"
   - **Payment Terms**: "30 days"
5. Add Items:
   - Click "+ Add Item"
   - **Item Description**: "Test Widget"
   - **Quantity**: 10
   - **Unit Price**: 100
   - **Discount %**: 5
   - **Tax %**: 18
6. Click "Create Sales Order"

### Expected Result
- ✅ Success message: "Direct Sales Order created successfully!"
- ✅ Modal closes
- ✅ Orders list refreshes with new SO
- ✅ New SO shows in table with:
  - SO Number (auto-generated)
  - Customer name
  - Project: "Test Project Alpha"
  - Order date, delivery date
  - Amount calculated correctly

### Verification Query
```sql
SELECT 
  so_number,
  customer_id,
  project,
  is_direct_order,
  source_type,
  quotation_id,
  total_amount,
  net_amount
FROM sales_orders
WHERE project = 'Test Project Alpha'
ORDER BY created_at DESC
LIMIT 1;
```

Expected values:
- `project`: "Test Project Alpha"
- `is_direct_order`: true
- `source_type`: "DIRECT" or "INTERNAL"
- `quotation_id`: NULL

## Test 2: Quotation Conversion with Project

### Frontend Test
1. Navigate to "Quotations" tab
2. Find an existing quotation (or create one first)
3. Click "Convert to SO" button
4. In conversion form:
   - **Expected Delivery Date**: Select future date
   - **Advance Amount**: 1000
   - **Payment Terms**: "Net 30"
   - **Project**: Enter "Test Project Beta"
   - Select quantities for items to convert
5. Click "Create Sales Order"

### Expected Result
- ✅ Success message: "Quotation converted to Sales Order successfully!"
- ✅ Modal closes
- ✅ Orders list shows new SO
- ✅ New SO has:
  - Project: "Test Project Beta"
  - Linked to quotation
  - Source type: QUOTATION

### Verification Query
```sql
SELECT 
  so_number,
  quotation_id,
  project,
  is_direct_order,
  source_type
FROM sales_orders
WHERE project = 'Test Project Beta'
ORDER BY created_at DESC
LIMIT 1;
```

Expected values:
- `project`: "Test Project Beta"
- `is_direct_order`: false
- `source_type`: "QUOTATION"
- `quotation_id`: NOT NULL (UUID of source quotation)

## Test 3: Project Display in Orders Table

### Frontend Test
1. Navigate to "Orders" tab
2. Verify table header shows "Project" column
3. Check that orders display their project values
4. Orders without projects show "-"

### Expected Result
- ✅ "Project" column visible between "Customer" and "Order Date"
- ✅ Test orders show correct project names
- ✅ Old orders (before migration) show "-"

## Test 4: Project Propagation to Job Orders

### Frontend Test
1. In "Orders" tab, find SO with project "Test Project Alpha"
2. Click "Create Job Order" button for that SO
3. Fill job order form and submit
4. Navigate to Production → Job Orders
5. Find the newly created job order

### Expected Result
- ✅ Job order created successfully
- ✅ Job order has project "Test Project Alpha" (inherited from SO)

### Verification Query
```sql
SELECT 
  jo.job_order_number,
  jo.project as job_order_project,
  so.so_number,
  so.project as sales_order_project,
  jo.sales_order_id
FROM production_job_orders jo
JOIN sales_orders so ON jo.sales_order_id = so.id
WHERE so.project = 'Test Project Alpha'
ORDER BY jo.created_at DESC
LIMIT 1;
```

Expected:
- `job_order_project` = `sales_order_project` (both "Test Project Alpha")
- Values should match exactly

## Test 5: Source Types

### Test 5a: DIRECT Source Type
1. Create direct SO with Source Type: "Direct Customer Order"
2. Verify in database: `source_type = 'DIRECT'`

### Test 5b: INTERNAL Source Type
1. Create direct SO with Source Type: "Internal Stock"
2. Verify in database: `source_type = 'INTERNAL'`

### Test 5c: QUOTATION Source Type
1. Convert quotation to SO
2. Verify in database: `source_type = 'QUOTATION'`

### Verification Query
```sql
SELECT 
  so_number,
  source_type,
  is_direct_order,
  quotation_id IS NULL as is_quotation_null
FROM sales_orders
ORDER BY created_at DESC
LIMIT 5;
```

## Test 6: Form Validation

### Test 6a: Empty Customer
1. Click "+ Create Direct Order"
2. Leave customer empty
3. Try to submit

**Expected**: Alert "Please select a customer"

### Test 6b: No Items
1. Click "+ Create Direct Order"
2. Select customer
3. Don't add any items
4. Try to submit

**Expected**: Alert "Please add at least one item"

### Test 6c: Invalid Quantities
1. Add item with quantity = 0
2. Try to submit

**Expected**: Form validation prevents submit (HTML5 min="1")

## Test 7: API Endpoint Testing (Optional)

Use Postman or curl:

```bash
# Get auth token from browser (DevTools → Application → Local Storage)
# Then test API directly:

curl -X POST http://localhost:4000/api/v1/sales/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "customer_id": "paste-real-customer-uuid-here",
    "order_date": "2025-01-15",
    "expected_delivery_date": "2025-02-15",
    "payment_terms": "Net 30",
    "project": "API Test Project",
    "source_type": "DIRECT",
    "items": [
      {
        "item_description": "API Test Item",
        "quantity": 5,
        "unit_price": 200,
        "discount_percentage": 10,
        "tax_percentage": 18
      }
    ]
  }'
```

**Expected Response**:
```json
{
  "id": "uuid",
  "so_number": "SO-2025-XXX",
  "customer_id": "uuid",
  "project": "API Test Project",
  "is_direct_order": true,
  "source_type": "DIRECT",
  "total_amount": 1000,
  "net_amount": 1062,
  ...
}
```

## Test 8: Backward Compatibility

### Test Existing Quotation Conversion
1. Use an existing quotation (created before this feature)
2. Convert to SO without entering project
3. Verify conversion still works

**Expected**: 
- ✅ Conversion succeeds
- ✅ SO created with project = NULL
- ✅ is_direct_order = false
- ✅ source_type = 'QUOTATION'

## Common Issues & Solutions

### Issue: "Column 'project' does not exist"
**Solution**: Database migration not applied. Run `add-sales-order-project-tracking.sql` in Supabase.

### Issue: "Cannot create direct order - 500 error"
**Solution**: 
1. Check browser console for error details
2. Check API logs: `pm2 logs api` or check running task output
3. Verify customer_id is valid UUID
4. Ensure items array is not empty

### Issue: "Project not showing in job order"
**Solution**:
1. Check trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'trg_job_order_inherit_project'`
2. Verify sales_order has project value
3. Check sales_order_id link is correct

### Issue: Form not appearing
**Solution**:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear React/Next.js cache
3. Check console for JavaScript errors

## Browser Console Checks

Open DevTools (F12) → Console tab

**Expected**: No errors
**If errors appear**: 
1. Note the error message
2. Check if it's related to sales page
3. Verify imports and component structure

## Database Verification Queries

### Check all new columns exist
```sql
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('sales_orders', 'production_job_orders')
  AND column_name IN ('project', 'is_direct_order', 'source_type', 'sales_order_item_id')
ORDER BY table_name, column_name;
```

### Check trigger function exists
```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'propagate_project_to_job_order';
```

### Check enum type
```sql
SELECT 
  t.typname,
  e.enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'sales_order_source'
ORDER BY e.enumsortorder;
```

Expected values: QUOTATION, DIRECT, INTERNAL

## Success Criteria

All tests passed when:
- ✅ Can create direct sales order via UI
- ✅ Can add project to quotation conversion
- ✅ Project column visible in orders table
- ✅ Project auto-propagates to job orders
- ✅ All three source types work (QUOTATION, DIRECT, INTERNAL)
- ✅ Form validations work correctly
- ✅ No console errors
- ✅ No API errors
- ✅ Database records match expected structure
- ✅ Trigger function executes correctly

## Post-Testing

Once all tests pass:
1. ✅ Mark deployment guide checklist complete
2. ✅ Commit changes to GitHub
3. ✅ Deploy to production (Hostinger)
4. ✅ Apply migration on production database
5. ✅ Test production environment

## Test Results Template

Copy this to track your testing:

```
## Test Results - [Date]

### Pre-Testing
- [ ] Database migration applied
- [ ] Migration completed successfully
- [ ] All 10 steps executed
- [ ] Trigger created

### Test 1: Direct SO Creation
- [ ] Form opens correctly
- [ ] Can select customer
- [ ] Can add items
- [ ] Can enter project
- [ ] Submission successful
- [ ] SO appears in table

### Test 2: Quotation Conversion
- [ ] Conversion form has project field
- [ ] Can enter project value
- [ ] Conversion successful
- [ ] Project saved correctly

### Test 3: Project Display
- [ ] Project column visible
- [ ] Values display correctly
- [ ] Empty projects show "-"

### Test 4: Project Propagation
- [ ] Job order created from SO
- [ ] Project inherited correctly
- [ ] Database verification passed

### Test 5: Source Types
- [ ] DIRECT type works
- [ ] INTERNAL type works
- [ ] QUOTATION type works

### Test 6: Validation
- [ ] Empty customer validation works
- [ ] No items validation works
- [ ] Quantity validation works

### Test 7: API Testing
- [ ] API endpoint responds
- [ ] Correct data returned
- [ ] Status code 200

### Test 8: Backward Compatibility
- [ ] Old quotations still convert
- [ ] No breaking changes

### Issues Found
(List any issues encountered)

### Overall Status
- [ ] All tests passed
- [ ] Ready for production
```
