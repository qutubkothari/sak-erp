-- HR TABLES VERIFICATION AND FIX SCRIPT
-- Since HR tables already exist, this script will verify and fix any issues

SELECT 'Checking existing HR tables...' as status;

-- Check if tenants table has data
DO $$
DECLARE
    tenant_count INTEGER;
    default_tenant_id UUID;
BEGIN
    SELECT COUNT(*) INTO tenant_count FROM tenants;
    RAISE NOTICE 'Found % tenants in database', tenant_count;
    
    IF tenant_count = 0 THEN
        -- Insert default tenant
        INSERT INTO tenants (name, subdomain, is_active) 
        VALUES ('SAK Solutions', 'sak', true)
        RETURNING id INTO default_tenant_id;
        RAISE NOTICE 'Created default tenant with ID: %', default_tenant_id;
    ELSE
        SELECT id INTO default_tenant_id FROM tenants LIMIT 1;
        RAISE NOTICE 'Using existing tenant ID: %', default_tenant_id;
    END IF;
END $$;

-- Check employees table structure and add sample data if empty
DO $$
DECLARE
    employee_count INTEGER;
    default_tenant_id UUID;
BEGIN
    SELECT COUNT(*) INTO employee_count FROM employees;
    SELECT id INTO default_tenant_id FROM tenants LIMIT 1;
    
    RAISE NOTICE 'Found % employees in database', employee_count;
    
    IF employee_count = 0 AND default_tenant_id IS NOT NULL THEN
        -- Insert sample employee for testing
        INSERT INTO employees (
            tenant_id, 
            employee_code, 
            employee_name, 
            designation, 
            department, 
            date_of_joining,
            email,
            contact_number,
            status
        ) VALUES (
            default_tenant_id,
            'EMP001',
            'Test Employee',
            'Software Engineer',
            'IT Department',
            CURRENT_DATE,
            'test@company.com',
            '+1234567890',
            'ACTIVE'
        );
        RAISE NOTICE 'Created sample employee for testing';
    END IF;
END $$;

-- Verify attendance_records table
DO $$
DECLARE
    attendance_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO attendance_count FROM attendance_records;
    RAISE NOTICE 'Found % attendance records', attendance_count;
END $$;

-- Check if salary_components table has data
DO $$
DECLARE
    salary_count INTEGER;
    default_tenant_id UUID;
    sample_employee_id UUID;
BEGIN
    SELECT COUNT(*) INTO salary_count FROM salary_components;
    RAISE NOTICE 'Found % salary components', salary_count;
    
    IF salary_count = 0 THEN
        SELECT id INTO default_tenant_id FROM tenants LIMIT 1;
        SELECT id INTO sample_employee_id FROM employees WHERE tenant_id = default_tenant_id LIMIT 1;
        
        IF sample_employee_id IS NOT NULL THEN
            -- Insert sample salary components
            INSERT INTO salary_components (tenant_id, employee_id, component_type, component_name, amount)
            VALUES 
                (default_tenant_id, sample_employee_id, 'BASIC', 'Basic Salary', 50000.00),
                (default_tenant_id, sample_employee_id, 'HRA', 'House Rent Allowance', 20000.00),
                (default_tenant_id, sample_employee_id, 'ALLOWANCE', 'Transport Allowance', 5000.00)
            ON CONFLICT DO NOTHING;
            RAISE NOTICE 'Created sample salary components';
        END IF;
    END IF;
END $$;

-- Verify table structures by checking key columns
DO $$
BEGIN
    -- Test attendance_records structure
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_records' 
        AND column_name = 'tenant_id'
    ) THEN
        RAISE NOTICE 'attendance_records.tenant_id column exists ✓';
    ELSE
        RAISE WARNING 'attendance_records.tenant_id column missing ✗';
    END IF;
    
    -- Test employees structure
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' 
        AND column_name = 'tenant_id'
    ) THEN
        RAISE NOTICE 'employees.tenant_id column exists ✓';
    ELSE
        RAISE WARNING 'employees.tenant_id column missing ✗';
    END IF;
END $$;

-- Show current data summary
SELECT 
    'tenants' as table_name, 
    COUNT(*) as record_count,
    (SELECT name FROM tenants LIMIT 1) as sample_name
FROM tenants
UNION ALL
SELECT 
    'employees', 
    COUNT(*),
    (SELECT employee_name FROM employees LIMIT 1)
FROM employees
UNION ALL
SELECT 
    'attendance_records', 
    COUNT(*),
    (SELECT attendance_date::text FROM attendance_records ORDER BY created_at DESC LIMIT 1)
FROM attendance_records
UNION ALL
SELECT 
    'leave_requests', 
    COUNT(*),
    (SELECT status FROM leave_requests LIMIT 1)
FROM leave_requests
UNION ALL
SELECT 
    'salary_components', 
    COUNT(*),
    (SELECT component_name FROM salary_components LIMIT 1)
FROM salary_components
UNION ALL
SELECT 
    'payroll_runs', 
    COUNT(*),
    (SELECT status FROM payroll_runs LIMIT 1)
FROM payroll_runs
UNION ALL
SELECT 
    'payslips', 
    COUNT(*),
    (SELECT salary_month FROM payslips LIMIT 1)
FROM payslips
ORDER BY table_name;

SELECT 'HR tables verification completed!' as status;
SELECT 'All HR tables exist. If you are still getting 500 errors, the issue may be in the API service configuration.' as message;