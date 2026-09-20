# Sales Order & Project Tracking Deployment Guide

## Overview
This deployment adds two major features to the Sales module:
1. **Direct Sales Order Creation** - Create sales orders directly without requiring a quotation (for internal stock)
2. **Project Tracking** - Tag sales orders and job orders with projects for better organization

## What's Been Implemented

### Backend (✅ Complete)
- **API Endpoint**: `POST /api/v1/sales/orders` - Create direct sales orders
- **Service Method**: `createDirectSalesOrder()` in `sales.service.ts`
- **Enhanced**: `convertQuotationToSO()` to include project field
- **Enhanced**: `getSalesOrders()` with project filtering

### Frontend (✅ Complete)
- **Direct SO Form**: Modal with customer selection, project field, items grid, source type
- **Project Field**: Added to quotation-to-SO conversion form
- **Orders Table**: Added "Project" column and "Create Direct Order" button
- **TypeScript**: Updated `SalesOrder` interface with `project`, `is_direct_order`, `source_type`

### Database (⏳ Pending - Manual Step Required)
Migration file ready: `add-sales-order-project-tracking.sql`

## Deployment Steps

### Step 1: Apply Database Migration

1. Open **Supabase Dashboard**: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Go to **SQL Editor**
3. Copy contents of `add-sales-order-project-tracking.sql`
4. Paste into SQL editor
5. Click **Run**

Expected output:
```
Step 1/10: Added project column to sales_orders
Step 2/10: Added project column to production_job_orders
Step 3/10: Created indexes
...
Step 10/10: Added source_type column
Migration completed successfully!
```

### Step 2: Verify Database Changes

Run this verification query in Supabase SQL Editor:
```sql
-- Check sales_orders columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales_orders'
  AND column_name IN ('project', 'is_direct_order', 'source_type', 'quotation_id');

-- Check production_job_orders columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'production_job_orders'
  AND column_name IN ('project', 'sales_order_item_id');

-- Check trigger exists
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_job_order_inherit_project';
```

Expected results:
- `sales_orders.project`: VARCHAR(200), nullable
- `sales_orders.is_direct_order`: BOOLEAN, nullable
- `sales_orders.source_type`: USER-DEFINED (enum), nullable
- `sales_orders.quotation_id`: UUID, nullable (changed from NOT NULL)
- `production_job_orders.project`: VARCHAR(200), nullable
- `production_job_orders.sales_order_item_id`: UUID, nullable
- Trigger `trg_job_order_inherit_project` exists on `production_job_orders`

### Step 3: Test Backend API

Use Postman or curl to test the new endpoint:

```bash
curl -X POST http://localhost:4000/api/v1/sales/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customer_id": "customer-uuid-here",
    "order_date": "2025-01-15",
    "expected_delivery_date": "2025-02-15",
    "payment_terms": "30 days",
    "project": "Project Alpha - Phase 1",
    "source_type": "DIRECT",
    "items": [
      {
        "item_description": "Test Item",
        "quantity": 10,
        "unit_price": 100,
        "discount_percentage": 5,
        "tax_percentage": 18
      }
    ]
  }'
```

Expected response: Sales order created with `is_direct_order: true` and `source_type: 'DIRECT'`

### Step 4: Test Frontend

1. Start development servers (should already be running):
   - API: Port 4000
   - Web: Port 3000

2. Navigate to: http://localhost:3000/dashboard/sales

3. Test Direct SO Creation:
   - Go to "Orders" tab
   - Click "+ Create Direct Order"
   - Fill customer, project, items
   - Select source type (DIRECT or INTERNAL)
   - Submit

4. Test Quotation Conversion with Project:
   - Go to "Quotations" tab
   - Select a quotation
   - Click "Convert to SO"
   - Fill project field
   - Submit

5. Verify Project Display:
   - Check "Orders" tab shows project column
   - Verify project values are displayed

### Step 5: Test Project Propagation

1. Create a sales order with project "Test Project"
2. Create a job order from that sales order
3. Query database to verify project inherited:

```sql
SELECT 
  so.so_number,
  so.project as so_project,
  jo.job_order_number,
  jo.project as jo_project
FROM sales_orders so
LEFT JOIN production_job_orders jo ON jo.sales_order_id = so.id
WHERE so.project = 'Test Project';
```

Expected: `jo.project` should match `so.project`

### Step 6: Deploy to GitHub

```powershell
cd C:\Users\QK\Documents\GitHub\sak-erp

git add .
git commit -m "feat: Sales Order & Project Tracking

- Add direct sales order creation (no quotation required)
- Add project field to sales orders and job orders
- Add auto-propagation trigger for project inheritance
- Add source_type enum (QUOTATION/DIRECT/INTERNAL)
- Update frontend with direct SO form and project field
- Make quotation_id nullable for direct orders

Database changes:
- sales_orders: +project, +is_direct_order, +source_type
- production_job_orders: +project, +sales_order_item_id
- New trigger: trg_job_order_inherit_project
- Indexes for project filtering

API changes:
- POST /sales/orders (new endpoint)
- Enhanced convertQuotationToSO with project
- Enhanced getSalesOrders with project filter"

git push origin main
```

### Step 7: Deploy to Hostinger

```powershell
# Run the deploy script
.\deploy-hostinger.ps1
```

Or manually:
1. SSH into Hostinger server
2. Navigate to application directory
3. Pull latest changes: `git pull origin main`
4. Apply database migration in production Supabase
5. Restart services: `pm2 restart all`

## Migration SQL Summary

The migration performs these operations:

1. **Add project column to sales_orders** (VARCHAR 200, nullable)
2. **Add project column to production_job_orders** (VARCHAR 200, nullable)
3. **Create indexes** for project filtering
4. **Add sales_order_item_id** to production_job_orders (UUID, nullable)
5. **Make quotation_id nullable** in sales_orders
6. **Add is_direct_order** boolean flag to sales_orders
7. **Create trigger function** `propagate_project_to_job_order()`
8. **Create trigger** `trg_job_order_inherit_project` on production_job_orders
9. **Backfill project** for existing job orders from linked sales orders
10. **Add source_type** enum column (QUOTATION/DIRECT/INTERNAL)

## Feature Usage

### Direct Sales Order Creation

**Use Case**: Customer places order directly (not from quotation) or internal stock requirement

**Steps**:
1. Navigate to Sales → Orders
2. Click "+ Create Direct Order"
3. Select customer
4. Choose source type:
   - **DIRECT**: Regular customer order
   - **INTERNAL**: Internal stock/testing
5. Enter project name (optional)
6. Add items with quantities and prices
7. Set payment terms
8. Submit

**Result**: Sales order created with:
- `quotation_id`: NULL
- `is_direct_order`: true
- `source_type`: DIRECT or INTERNAL
- `project`: as entered

### Quotation Conversion with Project

**Use Case**: Convert quotation to sales order and assign to a project

**Steps**:
1. Navigate to Sales → Quotations
2. Select quotation to convert
3. Click "Convert to SO"
4. Enter project name in "Project" field
5. Select quantities to convert
6. Submit

**Result**: Sales order created with:
- `quotation_id`: linked quotation
- `is_direct_order`: false
- `source_type`: QUOTATION
- `project`: as entered

### Project Propagation to Job Orders

**Automatic Process**:
1. Sales order has project "Project Alpha"
2. Job order created from sales order
3. Database trigger automatically copies "Project Alpha" to job order
4. No manual intervention needed

**Verification**:
```sql
SELECT jo.project 
FROM production_job_orders jo
WHERE jo.sales_order_id = 'sales-order-uuid';
-- Should return the same project as the sales order
```

## Rollback Plan

If issues occur, run this rollback SQL:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS trg_job_order_inherit_project ON production_job_orders;
DROP FUNCTION IF EXISTS propagate_project_to_job_order();

-- Remove columns (WARNING: Data loss)
ALTER TABLE production_job_orders DROP COLUMN IF EXISTS project;
ALTER TABLE production_job_orders DROP COLUMN IF EXISTS sales_order_item_id;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS project;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS is_direct_order;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS source_type;

-- Make quotation_id NOT NULL again
ALTER TABLE sales_orders ALTER COLUMN quotation_id SET NOT NULL;

-- Drop enum type
DROP TYPE IF EXISTS sales_order_source;

-- Remove indexes
DROP INDEX IF EXISTS idx_sales_orders_project;
DROP INDEX IF EXISTS idx_job_orders_project;
```

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] All 10 migration steps completed
- [ ] Trigger `trg_job_order_inherit_project` exists
- [ ] Can create direct sales order via API
- [ ] Can create direct sales order via UI
- [ ] Project field visible in SO conversion form
- [ ] Project field visible in orders table
- [ ] Project propagates from SO to job order
- [ ] Source type DIRECT works
- [ ] Source type INTERNAL works
- [ ] Source type QUOTATION works for conversions
- [ ] Existing quotation conversions still work
- [ ] Filter orders by project (API)
- [ ] No errors in browser console
- [ ] No errors in API logs

## Files Changed

### Created:
- `add-sales-order-project-tracking.sql` (200+ lines)
- `DEPLOY_SALES_ORDER_PROJECT_TRACKING.md` (this file)

### Modified:
- `apps/api/src/sales/controllers/sales.controller.ts` (+10 lines)
  - Added POST /orders endpoint
- `apps/api/src/sales/services/sales.service.ts` (+120 lines)
  - Added createDirectSalesOrder method
  - Added prepareSalesOrderItems helper
  - Enhanced getSalesOrders with project filter
  - Updated convertQuotationToSO with project
- `apps/web/src/app/dashboard/sales/page.tsx` (+250 lines)
  - Updated SalesOrder interface
  - Added directSOForm state
  - Added project to soConversionForm
  - Added handleCreateDirectSO handler
  - Added direct SO creation modal (200+ lines)
  - Added project field to SO conversion form
  - Added project column to orders table
  - Added "Create Direct Order" button

## Support & Troubleshooting

### Migration fails at step X
- Check error message
- Verify table exists: `SELECT * FROM information_schema.tables WHERE table_name = 'sales_orders'`
- Check for conflicts with existing columns
- Run steps individually if needed

### Direct SO creation returns 500 error
- Check API logs: `pm2 logs api`
- Verify customer_id is valid UUID
- Verify items array is not empty
- Check database connection

### Project not appearing in job order
- Verify trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'trg_job_order_inherit_project'`
- Check sales_order has project value
- Verify sales_order_id is correctly linked

### Frontend form not submitting
- Open browser console (F12)
- Check for JavaScript errors
- Verify API endpoint is reachable
- Check network tab for failed requests

## Next Steps (Optional Enhancements)

1. **Project Master Table**: Create a projects table with dropdown selection
2. **Project Dashboard**: View all orders grouped by project
3. **Project Reports**: Analytics per project (revenue, items, timelines)
4. **Project Templates**: Pre-configure common project setups
5. **Multi-Project Orders**: Allow one SO to span multiple projects
6. **Project Permissions**: Restrict access to projects by user role
7. **Project Costing**: Track costs vs revenue per project

## Contact
If you encounter any issues during deployment, please create an issue or contact the development team.
