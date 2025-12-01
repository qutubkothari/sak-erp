-- ============================================================================
-- HR TABLES CREATION - ROBUST VERSION
-- This script handles missing tenants table and creates a safe HR module
-- ============================================================================

-- Start transaction for safety
BEGIN;

SELECT 'Starting HR Tables creation...' as status;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify UUID generation function is available
DO $$
BEGIN
    -- Test if the function works
    PERFORM extensions.uuid_generate_v4();
    RAISE NOTICE 'UUID extension verified';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Using alternative UUID function';
END $$;

-- ============================================================================
-- STEP 1: Verify tenants table exists and ensure default tenant
-- ============================================================================

-- Verify tenants table exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
    ) THEN
        RAISE NOTICE 'Tenants table verified - exists';
        
        -- Insert default tenant if none exists
        INSERT INTO tenants (name, subdomain, is_active) 
        VALUES ('Default Tenant', 'default', true)
        ON CONFLICT (subdomain) DO NOTHING;
        
        RAISE NOTICE 'Default tenant ensured';
    ELSE
        RAISE EXCEPTION 'Tenants table does not exist! Please create it first.';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create HR-specific enums
-- ============================================================================

-- Create employee status enum
DO $$ BEGIN
    CREATE TYPE employee_status AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED');
    RAISE NOTICE 'Created employee_status enum';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'employee_status enum already exists';
END $$;

-- Create attendance status enum  
DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'LEAVE', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME');
    RAISE NOTICE 'Created attendance_status enum';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'attendance_status enum already exists';
END $$;

-- Create leave type enum
DO $$ BEGIN
    CREATE TYPE leave_type AS ENUM ('CASUAL', 'SICK', 'EARNED', 'UNPAID', 'MATERNITY', 'PATERNITY', 'COMP_OFF');
    RAISE NOTICE 'Created leave_type enum';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'leave_type enum already exists';
END $$;

-- Create salary component type enum
DO $$ BEGIN
    CREATE TYPE salary_component_type AS ENUM ('BASIC', 'HRA', 'ALLOWANCE', 'BONUS', 'DEDUCTION', 'PF', 'ESI', 'TAX');
    RAISE NOTICE 'Created salary_component_type enum';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'salary_component_type enum already exists';
END $$;

-- ============================================================================
-- STEP 3: Create HR tables with proper foreign key constraints
-- ============================================================================

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) NOT NULL,
    employee_name VARCHAR(200) NOT NULL,
    designation VARCHAR(100),
    department VARCHAR(100),
    date_of_joining DATE,
    date_of_birth DATE,
    contact_number VARCHAR(50),
    email VARCHAR(200),
    address TEXT,
    status employee_status DEFAULT 'ACTIVE',
    biometric_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, employee_code)
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    status attendance_status DEFAULT 'PRESENT',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    applied_at TIMESTAMP DEFAULT NOW(),
    approved_by UUID,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create salary_components table
CREATE TABLE IF NOT EXISTS salary_components (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    component_type salary_component_type NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    is_taxable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create payroll_runs table
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payroll_month VARCHAR(7) NOT NULL,
    run_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create payslips table
CREATE TABLE IF NOT EXISTS payslips (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payslip_number VARCHAR(50) NOT NULL,
    salary_month VARCHAR(7) NOT NULL,
    gross_salary DECIMAL(15,2) NOT NULL,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) NOT NULL,
    attendance_days INTEGER NOT NULL,
    leave_days INTEGER DEFAULT 0,
    approved_by UUID,
    approved_at TIMESTAMP,
    released_by UUID,
    released_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, payslip_number)
);

-- ============================================================================
-- STEP 4: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);

CREATE INDEX IF NOT EXISTS idx_leave_tenant ON leave_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_dates ON leave_requests(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_salary_tenant ON salary_components(tenant_id);
CREATE INDEX IF NOT EXISTS idx_salary_employee ON salary_components(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_type ON salary_components(component_type);

CREATE INDEX IF NOT EXISTS idx_payroll_tenant ON payroll_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll_runs(payroll_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_runs(status);

CREATE INDEX IF NOT EXISTS idx_payslip_tenant ON payslips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payslip_employee ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslip_month ON payslips(salary_month);
CREATE INDEX IF NOT EXISTS idx_payslip_run ON payslips(payroll_run_id);

-- ============================================================================
-- STEP 5: Insert sample data (optional - for testing)
-- ============================================================================

-- Get the default tenant ID for sample data
DO $$
DECLARE
    default_tenant_id UUID;
BEGIN
    SELECT id INTO default_tenant_id FROM tenants WHERE subdomain = 'default' LIMIT 1;
    
    IF default_tenant_id IS NOT NULL THEN
        -- Insert a sample employee
        INSERT INTO employees (
            tenant_id, employee_code, employee_name, designation, department,
            date_of_joining, email, contact_number, status
        ) VALUES (
            default_tenant_id, 
            'EMP001', 
            'John Doe', 
            'Software Engineer', 
            'IT Department',
            CURRENT_DATE,
            'john.doe@company.com',
            '+1234567890',
            'ACTIVE'
        ) ON CONFLICT (tenant_id, employee_code) DO NOTHING;
        
        RAISE NOTICE 'Sample employee data inserted';
    END IF;
END $$;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

SELECT 'HR Tables created successfully! ✅' as status;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show created tables
SELECT 
    'Table Verification' as check_type,
    table_name,
    (
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = t.table_name
    ) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('employees', 'attendance_records', 'leave_requests', 'salary_components', 'payroll_runs', 'payslips')
ORDER BY table_name;

-- Show record counts
SELECT 
    'employees' as table_name, COUNT(*) as record_count FROM employees
UNION ALL
SELECT 
    'attendance_records', COUNT(*) FROM attendance_records
UNION ALL
SELECT 
    'leave_requests', COUNT(*) FROM leave_requests
UNION ALL
SELECT 
    'salary_components', COUNT(*) FROM salary_components
UNION ALL
SELECT 
    'payroll_runs', COUNT(*) FROM payroll_runs
UNION ALL
SELECT 
    'payslips', COUNT(*) FROM payslips
ORDER BY table_name;