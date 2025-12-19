-- Create Monthly Payroll Processing Table (Updated to match salary slip format)
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
    days_travelled INT DEFAULT 0, -- No. of days Travelled
    comp_offs NUMERIC(4,1) DEFAULT 0, -- Comp-Offs
    leaves_absent INT DEFAULT 0, -- Leave(s) / Absent
    approved_paid_leaves INT DEFAULT 0, -- Approved Paid Leaves
    paid_for_total_days NUMERIC(5,1) NOT NULL DEFAULT 0, -- Paid for Total Days
    
    -- Variable Salary Components (included in gross)
    bonus_monthly NUMERIC(12,2) DEFAULT 0, -- Bonus Monthly
    production_incentive NUMERIC(12,2) DEFAULT 0, -- Production Incentive Monthly
    
    -- Held Components (on hold, not paid immediately)
    bonus_hold NUMERIC(12,2) DEFAULT 0, -- Bonus Monthly (On Hold)
    production_incentive_hold NUMERIC(12,2) DEFAULT 0, -- Production Incentive Monthly (On Hold)
    
    -- Other Components
    special_allowance NUMERIC(12,2) DEFAULT 0, -- Monthly Special Allowance
    professional_tax NUMERIC(12,2) DEFAULT 0, -- Less: Professional Tax (deduction)
    
    -- Calculated Amounts (as per salary slip format)
    gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0, -- Fixed + Bonus + Incentive + Special Allowance
    net_salary NUMERIC(12,2) NOT NULL DEFAULT 0, -- Gross - Professional Tax
    monthly_hold NUMERIC(12,2) NOT NULL DEFAULT 0, -- Bonus Hold + Incentive Hold
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0, -- Net Salary - Monthly Hold
    
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
COMMENT ON TABLE monthly_payroll IS 'Monthly payroll processing records matching salary slip format';
COMMENT ON COLUMN monthly_payroll.days_travelled IS 'Number of days employee travelled (from salary slip)';
COMMENT ON COLUMN monthly_payroll.comp_offs IS 'Compensatory offs taken (from salary slip)';
COMMENT ON COLUMN monthly_payroll.leaves_absent IS 'Number of days absent or on leave (from salary slip)';
COMMENT ON COLUMN monthly_payroll.approved_paid_leaves IS 'Approved paid leaves taken (from salary slip)';
COMMENT ON COLUMN monthly_payroll.paid_for_total_days IS 'Total days for which salary is paid (from salary slip)';
COMMENT ON COLUMN monthly_payroll.bonus_monthly IS 'Bonus Monthly - included in gross salary';
COMMENT ON COLUMN monthly_payroll.production_incentive IS 'Production Incentive Monthly - included in gross salary';
COMMENT ON COLUMN monthly_payroll.bonus_hold IS 'Bonus Monthly (On Hold) - calculated but not paid immediately';
COMMENT ON COLUMN monthly_payroll.production_incentive_hold IS 'Production Incentive Monthly (On Hold) - calculated but not paid immediately';
COMMENT ON COLUMN monthly_payroll.special_allowance IS 'Monthly Special Allowance as balancing figure';
COMMENT ON COLUMN monthly_payroll.net_salary IS 'Net Salary = Gross Salary - Professional Tax (before holds)';
COMMENT ON COLUMN monthly_payroll.monthly_hold IS 'Total amount held = Bonus Hold + Production Incentive Hold';
COMMENT ON COLUMN monthly_payroll.amount_paid IS 'Actual amount paid = Net Salary - Monthly Hold';
