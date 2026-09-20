-- Check Row Level Security (RLS) policies on vendors table

-- 1. Check if RLS is enabled on vendors table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'vendors';

-- 2. List all policies on vendors table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'vendors';

-- 3. Quick count of vendors in the table (bypassing RLS with service role)
SELECT 
    tenant_id,
    COUNT(*) as vendor_count
FROM vendors
GROUP BY tenant_id
ORDER BY vendor_count DESC;
