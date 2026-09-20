-- Quick check for vendor data
-- Run this to see vendor records and diagnose why list shows none

-- 1. Check if vendors table exists and has data
SELECT 
    'Total Vendors' as check_type,
    COUNT(*) as count
FROM vendors;

-- 2. Show all vendor records with key fields
SELECT 
    id,
    tenant_id,
    code,
    name,
    contact_person,
    email,
    phone,
    is_active,
    created_at
FROM vendors
ORDER BY created_at DESC;

-- 3. Check vendors by tenant_id
SELECT 
    tenant_id,
    COUNT(*) as vendor_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_count
FROM vendors
GROUP BY tenant_id;

-- 4. Check for any NULL tenant_id (which would be filtered out)
SELECT 
    'Vendors with NULL tenant_id' as issue,
    COUNT(*) as count
FROM vendors
WHERE tenant_id IS NULL;

-- 5. Show tenant information to verify correct tenant_id
SELECT 
    id as tenant_id,
    name as tenant_name,
    domain,
    is_active
FROM tenants
ORDER BY created_at DESC;

-- 6. Check if vendors match any existing tenant
SELECT 
    v.code,
    v.name,
    v.tenant_id,
    CASE 
        WHEN t.id IS NULL THEN 'NO MATCHING TENANT'
        ELSE t.name
    END as tenant_name,
    v.is_active as vendor_active,
    t.is_active as tenant_active
FROM vendors v
LEFT JOIN tenants t ON v.tenant_id = t.id
ORDER BY v.created_at DESC;
