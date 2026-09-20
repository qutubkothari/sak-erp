-- EMERGENCY FIX: Separate existing users into different tenants
-- This script creates a new tenant for kutubkothari@gmail.com and migrates their data

-- Step 1: Check current state
SELECT 
    'BEFORE FIX - User Accounts' as check_type,
    u.id as user_id,
    u.email,
    u.tenant_id,
    t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email IN ('hnoman@saksolution.com', 'kutubkothari@gmail.com')
ORDER BY u.email;

-- Step 2: Create new tenant for kutubkothari@gmail.com
-- First check what company name they should have
SELECT 
    'Determining New Tenant Name' as step,
    'Based on email domain: ' || SPLIT_PART(email, '@', 2) as suggestion
FROM users
WHERE email = 'kutubkothari@gmail.com';

-- Step 3: Create the new tenant (replace 'Kothari Company' with actual company name)
-- First check if tenant already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE name = 'Kothari Company') THEN
        INSERT INTO tenants (name, domain, is_active, created_at)
        VALUES (
            'Kothari Company', -- UPDATE THIS with actual company name
            'kothari-company',
            true,
            NOW()
        );
        RAISE NOTICE 'Created new tenant: Kothari Company';
    ELSE
        RAISE NOTICE 'Tenant already exists: Kothari Company';
    END IF;
END $$;

-- Show the created tenant
SELECT 'New Tenant Created' as step, id, name, domain 
FROM tenants 
WHERE name = 'Kothari Company';

-- Step 4: Get the IDs we need
WITH tenant_ids AS (
    SELECT id as sak_tenant_id FROM tenants WHERE name = 'SAK Solutions'
    UNION ALL
    SELECT id as kothari_tenant_id FROM tenants WHERE name = 'Kothari Company'
),
user_ids AS (
    SELECT id as hnoman_user_id FROM users WHERE email = 'hnoman@saksolution.com'
    UNION ALL
    SELECT id as kutub_user_id FROM users WHERE email = 'kutubkothari@gmail.com'
)
SELECT * FROM tenant_ids, user_ids;

-- Step 5: Update kutubkothari@gmail.com to new tenant
UPDATE users 
SET tenant_id = (SELECT id FROM tenants WHERE name = 'Kothari Company')
WHERE email = 'kutubkothari@gmail.com'
RETURNING id, email, tenant_id;

-- Step 6: Migrate kutubkothari's data to new tenant
-- Get kutubkothari's user_id and new tenant_id
DO $$
DECLARE
    v_kutub_user_id UUID;
    v_new_tenant_id UUID;
BEGIN
    SELECT id INTO v_kutub_user_id FROM users WHERE email = 'kutubkothari@gmail.com';
    SELECT id INTO v_new_tenant_id FROM tenants WHERE name = 'Kothari Company';
    
    RAISE NOTICE 'Migrating data for user % to tenant %', v_kutub_user_id, v_new_tenant_id;
    
    -- Note: Since we don't have created_by tracking, we cannot migrate specific user data
    -- This is a limitation of current schema
    -- Future: Add created_by column to all tables for proper data ownership
END $$;

-- Step 7: Verify separation
SELECT 
    'AFTER FIX - User Accounts' as check_type,
    u.id as user_id,
    u.email,
    u.tenant_id,
    t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email IN ('hnoman@saksolution.com', 'kutubkothari@gmail.com')
ORDER BY u.email;

-- Step 8: Verify data separation
SELECT 
    'AFTER FIX - Data by Tenant' as table_name,
    t.name as tenant_name,
    COUNT(DISTINCT v.id) as vendor_count,
    COUNT(DISTINCT i.id) as item_count,
    COUNT(DISTINCT c.id) as customer_count
FROM tenants t
LEFT JOIN vendors v ON v.tenant_id = t.id
LEFT JOIN items i ON i.tenant_id = t.id
LEFT JOIN customers c ON c.tenant_id = t.id
WHERE t.name IN ('SAK Solutions', 'Kothari Company')
GROUP BY t.id, t.name
ORDER BY t.name;

-- IMPORTANT NOTES:
-- 1. We cannot migrate existing vendors/items/customers because we don't track who created them (no created_by column)
-- 2. Both users will start fresh in their respective tenants
-- 3. All data remains in SAK Solutions tenant since we cannot determine ownership
-- 4. Recommendation: Add created_by column to all tables for future data ownership tracking
