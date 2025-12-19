import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class MigrationService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  async createHRTables() {
    const sql = `
-- Create employee status enum
DO $$ BEGIN
    CREATE TYPE employee_status AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create attendance status enum  
DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'LEAVE', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create leave type enum
DO $$ BEGIN
    CREATE TYPE leave_type AS ENUM ('CASUAL', 'SICK', 'EARNED', 'UNPAID', 'MATERNITY', 'PATERNITY', 'COMP_OFF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create salary component type enum
DO $$ BEGIN
    CREATE TYPE salary_component_type AS ENUM ('BASIC', 'HRA', 'ALLOWANCE', 'BONUS', 'DEDUCTION', 'PF', 'ESI', 'TAX');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id),
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    status attendance_status DEFAULT 'PRESENT',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);

-- De-duplicate attendance to enable unique constraint for biometric import
WITH ranked_attendance AS (
        SELECT
                id,
                ROW_NUMBER() OVER (
                        PARTITION BY tenant_id, employee_id, attendance_date
                        ORDER BY created_at DESC, id DESC
                ) AS rn
        FROM attendance_records
)
DELETE FROM attendance_records ar
USING ranked_attendance r
WHERE ar.id = r.id
    AND r.rn > 1;

-- Unique index needed for upsert(onConflict: 'tenant_id,employee_id,attendance_date')
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_tenant_employee_date
    ON attendance_records(tenant_id, employee_id, attendance_date);

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id),
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

CREATE INDEX IF NOT EXISTS idx_leave_tenant ON leave_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);

-- Create salary_components table
CREATE TABLE IF NOT EXISTS salary_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id),
    component_type salary_component_type NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    is_taxable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_tenant ON salary_components(tenant_id);
CREATE INDEX IF NOT EXISTS idx_salary_employee ON salary_components(employee_id);

-- Create payroll_runs table
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    payroll_month VARCHAR(7) NOT NULL,
    run_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_tenant ON payroll_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll_runs(payroll_month);

-- Create payslips table
CREATE TABLE IF NOT EXISTS payslips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
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

CREATE INDEX IF NOT EXISTS idx_payslip_tenant ON payslips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payslip_employee ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslip_month ON payslips(salary_month);

-- Employee documents
CREATE TABLE IF NOT EXISTS employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    doc_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_tenant ON employee_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);

-- Employee merits & demerits
CREATE TABLE IF NOT EXISTS employee_merits_demerits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    record_type VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    points INTEGER,
    event_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_employee_merit_demerit_type CHECK (record_type IN ('MERIT', 'DEMERIT'))
);

CREATE INDEX IF NOT EXISTS idx_employee_merits_demerits_tenant ON employee_merits_demerits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_merits_demerits_employee ON employee_merits_demerits(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_merits_demerits_date ON employee_merits_demerits(event_date);
`;

    try {
      const { data, error } = await this.supabase.rpc('exec_sql', { sql });
      if (error) throw error;
      
      return { success: true, message: 'HR tables created successfully' };
    } catch (error) {
      console.error('HR Migration error:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }
}