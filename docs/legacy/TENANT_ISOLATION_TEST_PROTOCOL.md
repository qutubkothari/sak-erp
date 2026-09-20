# TENANT ISOLATION TESTING PROTOCOL

## Pre-Test Setup

### 1. Verify Two Separate Tenants Exist
Run in Supabase SQL Editor:
```sql
SELECT 
    u.email,
    u.tenant_id,
    t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email IN ('hnoman@saksolution.com', 'kutubkothari@gmail.com');
```

**Expected Result:** Two different tenant_ids

**If Same Tenant:** Run `FIX_TENANT_SEPARATION.sql` first!

---

## Test Protocol

### Test 1: Login as Tenant A (hnoman@saksolution.com)
1. Open browser in Incognito/Private mode
2. Go to `http://13.205.17.214:3000/login`
3. Login as: `hnoman@saksolution.com`
4. Open DevTools Console (F12)
5. Run this code:
```javascript
const token = localStorage.getItem('accessToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Logged in as:', payload.email);
console.log('Tenant ID:', payload.tenantId);
```
6. **Record Tenant ID:** _________________

7. Go to **Purchase > Vendors**
8. **Record vendor count:** _________________
9. **Record vendor names:** _________________
10. Create a new vendor: `TEST-VENDOR-A`
11. Take screenshot of vendor list

---

### Test 2: Login as Tenant B (kutubkothari@gmail.com)
1. **IMPORTANT:** Close ALL browser windows
2. Open NEW browser in Incognito/Private mode
3. Go to `http://13.205.17.214:3000/login`
4. Login as: `kutubkothari@gmail.com`
5. Open DevTools Console (F12)
6. Run this code:
```javascript
const token = localStorage.getItem('accessToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Logged in as:', payload.email);
console.log('Tenant ID:', payload.tenantId);
```
7. **Record Tenant ID:** _________________

8. Go to **Purchase > Vendors**
9. **Record vendor count:** _________________
10. **Record vendor names:** _________________
11. Create a new vendor: `TEST-VENDOR-B`
12. Take screenshot of vendor list

---

### Test 3: Verify Isolation

**PASS Criteria:**
- ✅ Tenant IDs are DIFFERENT
- ✅ Tenant A only sees TEST-VENDOR-A
- ✅ Tenant B only sees TEST-VENDOR-B
- ✅ Tenant A does NOT see TEST-VENDOR-B
- ✅ Tenant B does NOT see TEST-VENDOR-A

**FAIL Criteria:**
- ❌ Same tenant ID for both users
- ❌ Either user sees the other's vendors
- ❌ Vendor count is same for both users

---

## SQL Verification

After tests, run in Supabase:
```sql
-- Check TEST vendors
SELECT 
    v.code,
    v.name,
    v.tenant_id,
    t.name as tenant_name,
    creator.email as created_by
FROM vendors v
LEFT JOIN tenants t ON v.tenant_id = t.id
LEFT JOIN users creator ON v.created_by = creator.id
WHERE v.name LIKE 'TEST-VENDOR-%'
ORDER BY v.created_at DESC;
```

**Expected:** 
- TEST-VENDOR-A has hnoman's tenant_id
- TEST-VENDOR-B has kutubkothari's tenant_id

---

## If Tests FAIL

### Failure Type 1: Same Tenant ID
**Cause:** Users were registered to same tenant
**Fix:** Run `FIX_TENANT_SEPARATION.sql`

### Failure Type 2: Different Tenant IDs but See Each Other's Data
**Cause:** Backend not filtering by tenant_id
**Fix:** Critical bug in backend service - needs immediate patch

### Failure Type 3: Frontend Caching
**Cause:** Browser caching data across sessions
**Fix:** Already applied - clear cache and retest

---

## Additional Tests

### Test 4: Items Isolation
Repeat Test 1-3 for:
- **Inventory > Items**
- Create `TEST-ITEM-A` for Tenant A
- Create `TEST-ITEM-B` for Tenant B
- Verify isolation

### Test 5: Purchase Orders Isolation
Repeat Test 1-3 for:
- **Purchase > Purchase Orders**
- Create PO for Tenant A
- Create PO for Tenant B
- Verify isolation

### Test 6: Sales Isolation
Repeat Test 1-3 for:
- **Sales > Customers**
- Create customer for Tenant A
- Create customer for Tenant B
- Verify isolation

---

## Final Verification SQL

```sql
-- Complete isolation check
WITH tenant_data AS (
  SELECT 
    u.email,
    u.tenant_id,
    t.name as tenant_name,
    (SELECT COUNT(*) FROM vendors WHERE tenant_id = u.tenant_id) as vendors,
    (SELECT COUNT(*) FROM items WHERE tenant_id = u.tenant_id) as items,
    (SELECT COUNT(*) FROM customers WHERE tenant_id = u.tenant_id) as customers,
    (SELECT COUNT(*) FROM purchase_orders WHERE tenant_id = u.tenant_id) as pos
  FROM users u
  LEFT JOIN tenants t ON u.tenant_id = t.id
  WHERE u.email IN ('hnoman@saksolution.com', 'kutubkothari@gmail.com')
)
SELECT * FROM tenant_data;
```

**Expected:** Each tenant shows ONLY their own data counts

---

## Sign-off

- [ ] Test 1 PASSED
- [ ] Test 2 PASSED
- [ ] Test 3 PASSED (Isolation verified)
- [ ] SQL Verification PASSED
- [ ] Additional Tests PASSED

**Tested By:** _________________
**Date:** _________________
**Status:** ☐ PASS / ☐ FAIL
**Notes:** _________________
