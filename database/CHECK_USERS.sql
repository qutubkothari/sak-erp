-- Check user accounts and their tenant associations
-- This will help us test the API with valid credentials

-- 1. List all users with their tenant information
SELECT 
    u.id as user_id,
    u.email,
    u.name as user_name,
    u.tenant_id,
    t.name as tenant_name,
    u.is_active as user_active,
    u.created_at
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
ORDER BY u.created_at DESC;

-- 2. Check if any users belong to the same tenant as the vendors
SELECT 
    'Users in SAK Solutions tenant' as check,
    COUNT(*) as user_count
FROM users
WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

-- 3. Show specific user details for SAK Solutions
SELECT 
    u.id,
    u.email,
    u.name,
    u.is_active,
    u.roles
FROM users u
WHERE u.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
ORDER BY u.created_at DESC;

-- 4. Verify the tenant ID matches
SELECT 
    'Vendor Tenant ID' as source,
    'f87a5ab0-0619-4f1c-bab9-e78ca750e56c' as tenant_id,
    t.name as tenant_name
FROM tenants t
WHERE t.id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
