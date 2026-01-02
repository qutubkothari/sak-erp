-- EMERGENCY FIX: Separate users into different tenants if they're wrongly sharing one

-- STEP 1: Check current state
SELECT 
    'Current State' as step,
    u.email,
    u.tenant_id,
    t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email IN ('hnoman@saksolution.com', 'kutubkothari@gmail.com');

-- STEP 2: If both users are in the SAME tenant, create a new tenant for one of them
-- (Only run if STEP 1 shows they share a tenant)

-- Create new tenant for kutubkothari@gmail.com
INSERT INTO tenants (name, domain, is_active)
VALUES ('Kutub Kothari Company', 'kutubkothari.com', true)
RETURNING id, name;

-- STEP 3: Move kutubkothari@gmail.com to the new tenant
-- Replace 'NEW_TENANT_ID' with the ID from STEP 2

-- UPDATE users 
-- SET tenant_id = 'NEW_TENANT_ID'
-- WHERE email = 'kutubkothari@gmail.com';

-- STEP 4: Move all data created by kutubkothari@gmail.com to the new tenant
-- (Only run if user has created data)

-- Get kutubkothari's user ID first
-- SELECT id FROM users WHERE email = 'kutubkothari@gmail.com';

-- Move vendors (replace USER_ID and NEW_TENANT_ID)
-- UPDATE vendors 
-- SET tenant_id = 'NEW_TENANT_ID'
-- WHERE created_by = 'USER_ID';

-- Move items
-- UPDATE items 
-- SET tenant_id = 'NEW_TENANT_ID'
-- WHERE created_by = 'USER_ID';

-- Move customers
-- UPDATE customers 
-- SET tenant_id = 'NEW_TENANT_ID'
-- WHERE created_by = 'USER_ID';

-- STEP 5: Verify separation
SELECT 
    'After Fix' as step,
    u.email,
    u.tenant_id,
    t.name as tenant_name,
    (SELECT COUNT(*) FROM vendors WHERE tenant_id = u.tenant_id) as vendor_count
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email IN ('hnoman@saksolution.com', 'kutubkothari@gmail.com');
