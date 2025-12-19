-- Create Monthly Payroll Processing Table
-- This table stores monthly variable payroll records with detailed breakdown

CREATE TABLE IF NOT EXISTS monthly_payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Month and Status
    payroll_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PROCESSED', 'PAID')),
    
    -- Attendance & Working Days
    days_in_month INT NOT NULL DEFAULT 30,
    days_travelled INT DEFAULT 0, -- Out of station travel days
    extra_days_worked INT DEFAULT 0, -- Holiday/Extra days worked
    
    -- Overtime Hours
    full_overtime_hours NUMERIC(5,2) DEFAULT 0, -- 4 hours extra
    half_overtime_hours NUMERIC(5,2) DEFAULT 0, -- 2 hours extra
    
    -- Variable Salary Components
    production_incentive NUMERIC(12,2) DEFAULT 0, -- Paid this month
    yearly_bonus_hold NUMERIC(12,2) DEFAULT 0, -- Calculated but held for year-end
    special_allowance NUMERIC(12,2) DEFAULT 0, -- Balancing figure
    professional_tax NUMERIC(12,2) DEFAULT 0, -- Deduction
    
    -- Calculated Amounts
    gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0, -- Net Salary - Yearly Bonus Hold
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    
    -- Constraints
    UNIQUE(tenant_id, employee_id, payroll_month)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_monthly_payroll_tenant ON monthly_payroll(tenant_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payroll_employee ON monthly_payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payroll_month ON monthly_payroll(payroll_month);
CREATE INDEX IF NOT EXISTS idx_monthly_payroll_status ON monthly_payroll(status);

-- Enable RLS
ALTER TABLE monthly_payroll ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their tenant's data
CREATE POLICY monthly_payroll_tenant_isolation ON monthly_payroll
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Grant permissions
GRANT ALL ON monthly_payroll TO authenticated;
GRANT ALL ON monthly_payroll TO service_role;

-- Add comments for documentation
COMMENT ON TABLE monthly_payroll IS 'Monthly payroll processing records with variable components';
COMMENT ON COLUMN monthly_payroll.days_travelled IS 'Number of days employee travelled out of station';
COMMENT ON COLUMN monthly_payroll.extra_days_worked IS 'Number of days worked on holidays';
COMMENT ON COLUMN monthly_payroll.full_overtime_hours IS 'Full overtime hours (4 extra hours per day)';
COMMENT ON COLUMN monthly_payroll.half_overtime_hours IS 'Half overtime hours (2 extra hours per day)';
COMMENT ON COLUMN monthly_payroll.production_incentive IS 'Production bonus paid in this month';
COMMENT ON COLUMN monthly_payroll.yearly_bonus_hold IS 'Yearly bonus calculated but held until year-end';
COMMENT ON COLUMN monthly_payroll.special_allowance IS 'Special allowance as balancing figure';
COMMENT ON COLUMN monthly_payroll.amount_paid IS 'Actual amount paid (Net Salary - Yearly Bonus Hold)';
