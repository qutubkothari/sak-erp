-- CRITICAL: TENANT ISOLATION AUDIT
-- This script checks if data is properly isolated between tenants
-- Run this to identify which tables have mixed tenant data

-- 1. CHECK TENANT SETUP
SELECT 
    'Total Tenants' as check,
    COUNT(*) as count
FROM tenants;

-- 2. LIST ALL TENANTS
SELECT 
    id,
    name,
    domain,
    is_active,
    created_at
FROM tenants
ORDER BY created_at;

-- 3. CHECK USERS PER TENANT (should be isolated)
SELECT 
    t.name as tenant_name,
    COUNT(u.id) as user_count
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 4. CHECK VENDORS PER TENANT (should be isolated)
SELECT 
    t.name as tenant_name,
    COUNT(v.id) as vendor_count
FROM tenants t
LEFT JOIN vendors v ON v.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 5. CHECK CUSTOMERS PER TENANT (should be isolated)
SELECT 
    t.name as tenant_name,
    COUNT(c.id) as customer_count
FROM tenants t
LEFT JOIN customers c ON c.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 6. CHECK ITEMS PER TENANT (should be isolated)
SELECT 
    t.name as tenant_name,
    COUNT(i.id) as item_count
FROM tenants t
LEFT JOIN items i ON i.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 7. CHECK PURCHASE ORDERS PER TENANT (should be isolated)
SELECT 
    t.name as tenant_name,
    COUNT(po.id) as po_count
FROM tenants t
LEFT JOIN purchase_orders po ON po.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 8. CHECK SALES ORDERS PER TENANT (should be isolated)
SELECT 
    t.name as tenant_name,
    COUNT(so.id) as sales_order_count
FROM tenants t
LEFT JOIN sales_orders so ON so.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 9. CHECK PRODUCTION ORDERS PER TENANT (should be isolated)
SELECT 
    t.name as tenant_name,
    COUNT(po.id) as production_order_count
FROM tenants t
LEFT JOIN production_orders po ON po.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 10. CHECK INVENTORY TRANSACTIONS PER TENANT (should be isolated)
SELECT 
    t.name as tenant_name,
    COUNT(it.id) as inventory_transaction_count
FROM tenants t
LEFT JOIN inventory_transactions it ON it.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 11. CRITICAL: Find any records WITHOUT tenant_id (DATA LEAK!)
SELECT 
    'vendors_without_tenant' as issue_type,
    COUNT(*) as problem_count
FROM vendors
WHERE tenant_id IS NULL
UNION ALL
SELECT 
    'customers_without_tenant',
    COUNT(*)
FROM customers
WHERE tenant_id IS NULL
UNION ALL
SELECT 
    'items_without_tenant',
    COUNT(*)
FROM items
WHERE tenant_id IS NULL
UNION ALL
SELECT 
    'users_without_tenant',
    COUNT(*)
FROM users
WHERE tenant_id IS NULL;

-- 12. DETAILED VIEW: Show which tenant each vendor belongs to
SELECT 
    v.code,
    v.name,
    t.name as tenant_name,
    v.created_at
FROM vendors v
LEFT JOIN tenants t ON v.tenant_id = t.id
ORDER BY t.name, v.created_at;

-- 13. DETAILED VIEW: Show which tenant each item belongs to
SELECT 
    i.item_code,
    i.item_name,
    t.name as tenant_name,
    i.created_at
FROM items i
LEFT JOIN tenants t ON i.tenant_id = t.id
ORDER BY t.name, i.created_at;
