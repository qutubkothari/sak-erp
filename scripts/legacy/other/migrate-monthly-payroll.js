const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ynlxcshcvpwifgudswmg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlubHhjc2hjdnB3aWZndWRzd21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjY5Njk2MSwiZXhwIjoyMDQ4MjcyOTYxfQ.rWbWpk3xD8Sn1xtAmf2OM1q6MDlE-EOWX78qV_e5-mc'
);

async function migrate() {
  console.log('Creating monthly_payroll table...');
  
  try {
    // Check if table exists
    const { data: existingTable, error: checkError } = await supabase
      .from('monthly_payroll')
      .select('id')
      .limit(1);
    
    if (!checkError || checkError.code === 'PGRST116') {
      // Table doesn't exist or other error, try to create it
      // We'll use raw SQL via a database connection
      console.log('Please run the following SQL in your Supabase SQL Editor:');
      console.log('');
      console.log('----------------------------------------');
      console.log(`
CREATE TABLE IF NOT EXISTS monthly_payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payroll_month VARCHAR(7) NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PROCESSED', 'PAID')),
    days_in_month INT NOT NULL DEFAULT 30,
    days_travelled INT DEFAULT 0,
    extra_days_worked INT DEFAULT 0,
    full_overtime_hours NUMERIC(5,2) DEFAULT 0,
    half_overtime_hours NUMERIC(5,2) DEFAULT 0,
    production_incentive NUMERIC(12,2) DEFAULT 0,
    yearly_bonus_hold NUMERIC(12,2) DEFAULT 0,
    special_allowance NUMERIC(12,2) DEFAULT 0,
    professional_tax NUMERIC(12,2) DEFAULT 0,
    gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    UNIQUE(tenant_id, employee_id, payroll_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_payroll_tenant ON monthly_payroll(tenant_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payroll_employee ON monthly_payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payroll_month ON monthly_payroll(payroll_month);
CREATE INDEX IF NOT EXISTS idx_monthly_payroll_status ON monthly_payroll(status);

ALTER TABLE monthly_payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY monthly_payroll_tenant_isolation ON monthly_payroll
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

GRANT ALL ON monthly_payroll TO authenticated;
GRANT ALL ON monthly_payroll TO service_role;
      `);
      console.log('----------------------------------------');
      console.log('');
      console.log('Go to: https://supabase.com/dashboard/project/ynlxcshcvpwifgudswmg/sql/new');
    } else {
      console.log('Table already exists!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

migrate();
