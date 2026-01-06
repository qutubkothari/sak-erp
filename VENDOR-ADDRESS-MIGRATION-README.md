# Vendor Address Migration Instructions

## What Changed
We've updated the Vendor management system to use **Zoho-style structured address fields** instead of a single text area.

### New Fields Added:
**Billing Address:**
- Street (full street address)
- City
- State
- Country (defaults to "India")
- PIN Code

**Shipping Address:**
- Shipping Street
- Shipping City
- Shipping State
- Shipping Country (defaults to "India")
- Shipping PIN Code
- "Same as Billing" checkbox for convenience

## Database Migration Steps

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project: https://supabase.com/dashboard/project/YOUR_PROJECT
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `APPLY-VENDOR-ADDRESS-MIGRATION.sql`
5. Paste into the SQL Editor
6. Click **Run** or press `Ctrl+Enter`
7. Verify success message appears

### Option 2: Using Supabase CLI
```bash
supabase db execute --file APPLY-VENDOR-ADDRESS-MIGRATION.sql
```

## After Migration
- **Frontend**: New vendor form now has structured address fields
- **Backend**: API automatically handles the new address structure
- **Data Migration**: Existing `address` field data is copied to `street` field
- **Old Data**: The original `address` field is preserved but disabled in the UI

## What Users Will See
- When creating/editing vendors, they'll see separate fields for:
  - Street, City, State, Country, PIN Code
  - Optional separate shipping address
  - "Same as Billing" checkbox to auto-fill shipping address

## Rollback (if needed)
If you need to revert:
```sql
ALTER TABLE vendors
DROP COLUMN IF EXISTS street,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS state,
DROP COLUMN IF EXISTS country,
DROP COLUMN IF EXISTS pincode,
DROP COLUMN IF EXISTS shipping_street,
DROP COLUMN IF EXISTS shipping_city,
DROP COLUMN IF EXISTS shipping_state,
DROP COLUMN IF EXISTS shipping_country,
DROP COLUMN IF EXISTS shipping_pincode;
```

## Files Modified
- ✅ `apps/web/src/app/dashboard/purchase/vendors/page.tsx` - Frontend UI
- ✅ `apps/api/src/purchase/services/vendors.service.ts` - Backend service
- ✅ `add-structured-vendor-address.sql` - Migration file
- ✅ `APPLY-VENDOR-ADDRESS-MIGRATION.sql` - Safe migration with error handling
