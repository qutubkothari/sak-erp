-- Check current data state
SELECT 'Users' as info, email, tenant_id FROM users WHERE email IN ('hnoman@saksolution.com', 'kutubkothari@gmail.com');

SELECT 'Tenants' as info, id, name FROM tenants;

SELECT 'Vendors Count' as info, COUNT(*) as count, tenant_id FROM vendors GROUP BY tenant_id;

SELECT 'Vendor Details' as info, id, name, tenant_id FROM vendors LIMIT 10;

SELECT 'GRN Count' as info, COUNT(*) as count, tenant_id FROM grn GROUP BY tenant_id;

SELECT 'GRN Details' as info, id, grn_number, tenant_id FROM grn LIMIT 10;
