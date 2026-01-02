# Debugging Vendor List Issue

## Problem
3 vendors were entered but the list shows "none"

## Possible Causes

### 1. Database Issues
- Vendors have wrong `tenant_id`
- Vendors have `is_active = false`
- Vendors have NULL `tenant_id`
- Vendors table is empty

### 2. API Issues
- API filtering by `tenant_id` doesn't match user's tenant
- API returning empty array
- Authentication token missing or invalid
- Wrong tenant_id in JWT token

### 3. Frontend Issues
- API response not being parsed correctly
- Vendors array not being set in state
- Filter conditions hiding vendors
- Search term filtering out all vendors

## Debugging Steps

### Step 1: Check Database
Run the SQL query in `CHECK_VENDORS.sql`:

```bash
# Connect to Supabase and run the query
```

**Expected Results:**
- Should see 3 vendor records
- All should have valid `tenant_id`
- All should have `is_active = true`
- `tenant_id` should match an existing tenant

### Step 2: Test API Directly
Use curl or Postman to test the API endpoint:

```bash
# Get your access token from browser localStorage
# In browser console: localStorage.getItem('accessToken')

# Then test the API
curl -X GET "http://13.205.17.214:4000/api/v1/purchase/vendors" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
[
  {
    "id": "...",
    "code": "VEN001",
    "name": "Vendor Name",
    "tenant_id": "...",
    "is_active": true,
    ...
  }
]
```

### Step 3: Check Browser Console
Open browser DevTools and check:

1. **Network Tab:**
   - Look for `/purchase/vendors` request
   - Check response status (should be 200)
   - Check response body (should have vendor array)

2. **Console Tab:**
   - Look for error messages
   - Check for "Error fetching vendors:" messages

3. **Application Tab (localStorage):**
   - Verify `accessToken` exists
   - Verify token is not expired

### Step 4: Add Debug Logging
Temporarily add console.log to the frontend:

In `apps/web/src/app/dashboard/purchase/vendors/page.tsx`:

```typescript
const fetchVendors = async () => {
  try {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCategory !== 'ALL') params.append('category', filterCategory);
    if (searchTerm) params.append('search', searchTerm);

    console.log('🔍 Fetching vendors with params:', params.toString());
    const data = await apiClient.get<Vendor[]>(`/purchase/vendors?${params}`);
    console.log('📦 Raw API response:', data);
    console.log('✅ Is array?', Array.isArray(data));
    console.log('📊 Vendor count:', Array.isArray(data) ? data.length : 0);
    
    setVendors(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('❌ Error fetching vendors:', error);
  } finally {
    setLoading(false);
  }
};
```

### Step 5: Check Backend Service
Check the `VendorsService.findAll` method in:
`apps/api/src/purchase/services/vendors.service.ts`

Verify:
- It's correctly filtering by `tenant_id`
- The tenant_id from JWT matches the vendors in DB
- No additional filters are hiding vendors

## Quick Fixes to Try

### Fix 1: Remove All Filters
Temporarily remove category filter:
```typescript
// In vendors page, change:
useEffect(() => {
  fetchVendors();
}, []); // Remove filterCategory dependency
```

### Fix 2: Check Token Payload
In browser console:
```javascript
// Decode JWT token
const token = localStorage.getItem('accessToken');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
  console.log('Tenant ID:', payload.tenantId);
}
```

### Fix 3: Direct API Test (No Auth)
Temporarily test without auth to verify database has data:
```sql
-- In Supabase SQL editor:
SELECT id, code, name, tenant_id, is_active 
FROM vendors 
ORDER BY created_at DESC 
LIMIT 10;
```

## Resolution Checklist

- [ ] Run CHECK_VENDORS.sql and verify 3 vendors exist
- [ ] Verify all vendors have same tenant_id
- [ ] Verify vendors have is_active = true
- [ ] Check tenant_id matches logged-in user's tenant
- [ ] Test API endpoint with curl/Postman
- [ ] Check browser console for errors
- [ ] Verify API response is array with vendor objects
- [ ] Check frontend state (vendors array length)
- [ ] Verify no filters are hiding vendors (category, search, isActive)
- [ ] Check JWT token has correct tenantId claim

## Expected Flow

1. User logs in → JWT token generated with `tenantId`
2. Token stored in localStorage
3. Frontend calls `/purchase/vendors` with token
4. Backend extracts `tenantId` from JWT
5. Backend queries: `SELECT * FROM vendors WHERE tenant_id = {tenantId}`
6. Backend returns array of vendor objects
7. Frontend sets vendors in state
8. UI displays vendor cards

## Common Issues

1. **Wrong tenant_id in database**: Vendors created with different tenant_id
2. **Expired token**: User needs to re-login
3. **Backend not running**: Check server status
4. **RLS policies**: Supabase RLS blocking queries
5. **Empty response treated as error**: Check error handling in frontend
