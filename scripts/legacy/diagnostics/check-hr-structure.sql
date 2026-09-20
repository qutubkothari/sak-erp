-- SIMPLE HR TABLES DATA CHECK AND FIX
-- This script checks actual table structures and adds sample data correctly

SELECT 'Checking HR table structures...' as status;

-- Check salary_components table structure
SELECT 
    'salary_components columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'salary_components' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check employees table structure  
SELECT 
    'employees columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check attendance_records table structure
SELECT 
    'attendance_records columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show current data counts
SELECT 
    'Data Summary' as check_type,
    'tenants' as table_name, 
    COUNT(*) as record_count
FROM tenants
UNION ALL
SELECT 
    'Data Summary',
    'employees', 
    COUNT(*)
FROM employees
UNION ALL
SELECT 
    'Data Summary',
    'attendance_records', 
    COUNT(*)
FROM attendance_records
UNION ALL
SELECT 
    'Data Summary',
    'salary_components', 
    COUNT(*)
FROM salary_components
ORDER BY table_name;

-- Add sample tenant if none exists
INSERT INTO tenants (name, subdomain, is_active) 
VALUES ('SAK Solutions', 'sak', true)
ON CONFLICT (subdomain) DO NOTHING;

-- Add sample employee if none exists (only if employees table has correct structure)
DO $$
DECLARE
    tenant_count INTEGER;
    employee_count INTEGER;
    has_tenant_id BOOLEAN := false;
    sample_tenant_id UUID;
BEGIN
    -- Check if employees table has tenant_id column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' 
        AND column_name = 'tenant_id'
    ) INTO has_tenant_id;
    
    SELECT COUNT(*) INTO tenant_count FROM tenants;
    SELECT COUNT(*) INTO employee_count FROM employees;
    
    IF employee_count = 0 AND tenant_count > 0 THEN
        SELECT id INTO sample_tenant_id FROM tenants LIMIT 1;
        
        IF has_tenant_id THEN
            -- Insert with tenant_id
            INSERT INTO employees (
                tenant_id, employee_code, employee_name, designation, 
                department, date_of_joining, email, status
            ) VALUES (
                sample_tenant_id, 'EMP001', 'Test Employee', 'Engineer', 
                'IT', CURRENT_DATE, 'test@company.com', 'ACTIVE'
            );
            RAISE NOTICE 'Added employee with tenant_id';
        ELSE
            -- Insert without tenant_id
            INSERT INTO employees (
                employee_code, employee_name, designation, 
                department, date_of_joining, email, status
            ) VALUES (
                'EMP001', 'Test Employee', 'Engineer', 
                'IT', CURRENT_DATE, 'test@company.com', 'ACTIVE'
            );
            RAISE NOTICE 'Added employee without tenant_id';
        END IF;
    END IF;
END $$;

SELECT 'HR tables check completed!' as status;
SELECT 'Check the column structures above to understand your table schemas.' as message;