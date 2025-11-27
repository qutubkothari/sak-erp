# URGENT: Apply Purchase Management Migration

## Critical Issue
The purchase management tables (vendors, purchase_requisitions, purchase_orders) do not exist in the database. This blocks ALL procurement, production, and sales workflows.

## Migration File
**Location:** `/tmp/create-purchase-management.sql` (on server)  
**Also:** `migrations/create-purchase-management.sql` (in repo)

## How to Apply Migration

### Option 1: Supabase Dashboard (RECOMMENDED)
1. Go to https://nwkaruzvzwwuftjquypk.supabase.co
2. Login to Supabase dashboard
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy contents of `migrations/create-purchase-management.sql`
6. Paste into SQL Editor
7. Click **Run**
8. Verify success message: "Purchase Management tables created successfully"

### Option 2: Using psql (if you have direct DB access)
```bash
# Get database connection string from Supabase dashboard
# Settings > Database > Connection String > Connection Pooling

psql "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" -f /tmp/create-purchase-management.sql
```

### Option 3: Via Supabase API
```bash
# Use Supabase service role key (not the publishable key)
curl -X POST 'https://nwkaruzvzwwuftjquypk.supabase.co/rest/v1/rpc/exec_sql' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "SQL_CONTENT_HERE"}'
```

## Tables Created by Migration

1. **vendors** - Vendor master with quality ratings
   - Columns: code, name, contact details, payment terms, credit limit, quality rating
   
2. **purchase_requisitions** - Internal purchase requests
   - Columns: PR number, dates, department, approval workflow
   
3. **purchase_requisition_items** - PR line items
   - Columns: item code/name, quantities, estimated rates
   
4. **purchase_orders** - Purchase orders to vendors
   - Columns: PO number, vendor link, amounts, approval workflow
   
5. **purchase_order_items** - PO line items
   - Columns: item details, quantities, rates, taxes
   
6. **items** - Item master
   - Columns: item code, name, category, UOM, stock levels
   
7. **warehouses** - Warehouse/location master
   - Columns: warehouse code, name, location

## Verification Steps

After applying migration, verify tables created:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('vendors', 'purchase_requisitions', 'purchase_orders', 'items', 'warehouses')
ORDER BY table_name;

-- Should return 5 rows

-- Check vendor table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vendors' 
ORDER BY ordinal_position;
```

## After Migration - Resume Testing

Once migration applied, run:

```bash
ssh -i "saif-erp.pem" ubuntu@35.154.55.38 "/tmp/test-e2e-purchase.sh"
```

This will test the complete purchase flow:
1. ✅ Authentication
2. ✅ Create Vendor
3. ✅ Create Purchase Requisition
4. ✅ Approve PR
5. ✅ Create Purchase Order
6. ✅ Create GRN with UID generation
7. ✅ Verify UIDs created

## Expected Outcome

All purchase management tests should PASS, unblocking:
- BOM creation (needs items)
- Production orders (needs BOM and items)
- GRN with UID generation
- Quality inspection (uses vendor ratings)
- Sales orders (needs inventory from GRN)
- Complete end-to-end business process

## Critical: Do NOT Go Live Without This

The system is non-functional without these tables. Authentication works but all business processes are blocked.

**Status:** ⚠️ BLOCKING - Apply immediately before any further testing
