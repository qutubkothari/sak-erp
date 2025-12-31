-- EMERGENCY: TENANT DATA BREACH INVESTIGATION
-- Vendors created by hnoman@saksolution.com are showing in kutubkothari@gmail.com

-- 1. Find the two user accounts and their tenant_ids
SELECT 
    'User Account Info' as check_type,
    u.id as user_id,
    u.email,
    u.tenant_id,
    t.name as tenant_name,
    t.domain as tenant_domain
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email IN ('hnoman@saksolution.com', 'kutubkothari@gmail.com')
ORDER BY u.email;

-- 2. Check what tenant_id the vendors have
SELECT 
    'Vendor Tenant Check' as check_type,
    v.code,
    v.name,
    v.tenant_id,
    v.created_at,
    t.name as tenant_name
FROM vendors v
LEFT JOIN tenants t ON v.tenant_id = t.id
ORDER BY v.created_at DESC;

-- 3. Check if both users belong to SAME or DIFFERENT tenants
SELECT 
    'Tenant Comparison' as check_type,
    COUNT(DISTINCT u.tenant_id) as unique_tenant_count,
    STRING_AGG(DISTINCT t.name, ', ') as tenant_names,
    STRING_AGG(DISTINCT u.email, ', ') as user_emails
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email IN ('hnoman@saksolution.com', 'kutubkothari@gmail.com');

-- 4. List all vendors with their tenant assignment
SELECT 
    'Vendor List by Tenant' as check_type,
    v.code,
    v.name,
    v.tenant_id as vendor_tenant_id,
    t.name as tenant_name,
    v.created_at,
    v.is_active
FROM vendors v
LEFT JOIN tenants t ON v.tenant_id = t.id
ORDER BY v.created_at DESC;

-- 5. CRITICAL: Check if all vendors have valid tenant_id
SELECT 
    'CRITICAL: Vendor Tenant Validation' as issue_type,
    v.code as vendor_code,
    v.name as vendor_name,
    v.tenant_id as vendor_tenant_id,
    vt.name as vendor_tenant_name,
    v.created_at,
    CASE 
        WHEN v.tenant_id IS NULL THEN '❌ NULL TENANT - CRITICAL BUG!'
        WHEN vt.id IS NULL THEN '❌ INVALID TENANT - ORPHANED RECORD!'
        ELSE '✅ Valid Tenant'
    END as status
FROM vendors v
LEFT JOIN tenants vt ON v.tenant_id = vt.id
ORDER BY v.created_at DESC;

-- 6. Check ALL data tables for similar issues
SELECT 
    'Items by Tenant' as table_name,
    t.name as tenant_name,
    COUNT(i.id) as record_count
FROM tenants t
LEFT JOIN items i ON i.tenant_id = t.id
GROUP BY t.id, t.name
UNION ALL
SELECT 
    'Customers by Tenant',
    t.name,
    COUNT(c.id)
FROM tenants t
LEFT JOIN customers c ON c.tenant_id = t.id
GROUP BY t.id, t.name
UNION ALL
SELECT 
    'Purchase Orders by Tenant',
    t.name,
    COUNT(po.id)
FROM tenants t
LEFT JOIN purchase_orders po ON po.tenant_id = t.id
GROUP BY t.id, t.name
UNION ALL
SELECT 
    'Sales Orders by Tenant',
    t.name,
    COUNT(so.id)
FROM tenants t
LEFT JOIN sales_orders so ON so.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY table_name, tenant_name;
