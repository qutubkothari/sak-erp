import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client } from 'pg';

@Injectable()
export class MigrationService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  /**
   * Administrative migrations must use the database connection, not a
   * PostgREST RPC helper. The previous helper (`exec_sql`) is not present in
   * production/test databases and caused every migration button to return 500.
   */
  private async executeSql(sql: string) {
    const rawUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
    if (!rawUrl) throw new Error('DATABASE_URL is required for database migrations');
    const connectionString = rawUrl.replace(/([?&])sslmode=require(&|$)/, (_match, prefix, suffix) =>
      suffix ? prefix : '',
    );
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20_000,
    });
    try {
      await client.connect();
      await client.query(sql);
    } finally {
      await client.end().catch(() => undefined);
    }
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
    per_diem_amount DECIMAL(12,2) DEFAULT 0,
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
    is_outstation_travel BOOLEAN DEFAULT false,
    travel_departure_time TIME,
    travel_arrival_time TIME,
    travel_notes TEXT,
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

-- Holiday calendar
CREATE TABLE IF NOT EXISTS hr_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  holiday_name VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  holiday_type VARCHAR(50) DEFAULT 'PUBLIC',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_holidays_tenant ON hr_holidays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_holidays_start_date ON hr_holidays(start_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_holidays_tenant_name_start ON hr_holidays(tenant_id, holiday_name, start_date);

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
    travel_days NUMERIC(8,2) DEFAULT 0,
    per_diem_amount DECIMAL(12,2) DEFAULT 0,
    total_per_diem DECIMAL(12,2) DEFAULT 0,
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

-- Idempotent compatibility for existing HR installations.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS per_diem_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS is_outstation_travel BOOLEAN DEFAULT false;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS travel_departure_time TIME;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS travel_arrival_time TIME;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS travel_notes TEXT;
ALTER TABLE IF EXISTS attendance ADD COLUMN IF NOT EXISTS is_outstation_travel BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS attendance ADD COLUMN IF NOT EXISTS travel_departure_time TIME;
ALTER TABLE IF EXISTS attendance ADD COLUMN IF NOT EXISTS travel_arrival_time TIME;
ALTER TABLE IF EXISTS attendance ADD COLUMN IF NOT EXISTS travel_notes TEXT;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS travel_days NUMERIC(8,2) DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS per_diem_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS total_per_diem DECIMAL(12,2) DEFAULT 0;

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
      await this.executeSql(sql);
      
      return { success: true, message: 'HR tables created successfully' };
    } catch (error) {
      console.error('HR Migration error:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  async createBomRoutingTable() {
    const sql = `
CREATE TABLE IF NOT EXISTS public.bom_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bom_id UUID NOT NULL REFERENCES public.bom_headers(id) ON DELETE CASCADE,
  operation_sequence INTEGER NOT NULL,
  operation_name VARCHAR(255),
  workstation_id UUID REFERENCES public.work_stations(id),
  cycle_time DECIMAL(10, 2),
  setup_time DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bom_routing_bom_id ON public.bom_routing(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_routing_tenant_id ON public.bom_routing(tenant_id);

ALTER TABLE public.bom_routing ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS tenant_isolation_bom_routing ON public.bom_routing
  USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

COMMENT ON TABLE public.bom_routing IS 'Stores routing/operation steps for BOMs';
COMMENT ON COLUMN public.bom_routing.operation_sequence IS 'Order in which operations are performed';
COMMENT ON COLUMN public.bom_routing.cycle_time IS 'Time in hours to complete the operation';
COMMENT ON COLUMN public.bom_routing.setup_time IS 'Setup time in hours for the operation';
`;

    try {
      await this.executeSql(sql);
      
      return { success: true, message: 'BOM routing table created successfully' };
    } catch (error) {
      console.error('BOM Routing Migration error:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  async createSubcontractingTables() {
    const sql = `
CREATE TABLE IF NOT EXISTS public.subcontract_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route_number VARCHAR(60) NOT NULL,
  name VARCHAR(255) NOT NULL,
  input_item_id UUID,
  output_item_id UUID,
  default_input_qty NUMERIC(18, 4) DEFAULT 0,
  default_output_qty NUMERIC(18, 4) DEFAULT 0,
  consumption_per_output_qty NUMERIC(18, 4) DEFAULT 0,
  expected_consumption_qty NUMERIC(18, 4) DEFAULT 0,
  expected_unused_qty NUMERIC(18, 4) DEFAULT 0,
  uom VARCHAR(50),
  status VARCHAR(30) DEFAULT 'ACTIVE',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, route_number)
);

CREATE TABLE IF NOT EXISTS public.subcontract_route_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route_id UUID NOT NULL REFERENCES public.subcontract_routes(id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL,
  node_key VARCHAR(80),
  parent_node_key VARCHAR(80),
  branch_no INTEGER DEFAULT 1,
  operation_name VARCHAR(255) NOT NULL,
  process_type VARCHAR(80) DEFAULT 'OUTSIDE_PROCESSING',
  vendor_id UUID,
  department VARCHAR(120),
  input_item_id UUID,
  output_item_id UUID,
  default_input_qty NUMERIC(18, 4) DEFAULT 0,
  default_output_qty NUMERIC(18, 4) DEFAULT 0,
  standard_yield_pct NUMERIC(8, 3) DEFAULT 100,
  scrap_tolerance_pct NUMERIC(8, 3) DEFAULT 0,
  qc_required BOOLEAN DEFAULT true,
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, route_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS public.subcontract_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  order_number VARCHAR(60) NOT NULL,
  route_id UUID REFERENCES public.subcontract_routes(id),
  source_warehouse_id UUID,
  output_warehouse_id UUID,
  input_item_id UUID,
  output_item_id UUID,
  planned_input_qty NUMERIC(18, 4) DEFAULT 0,
  planned_output_qty NUMERIC(18, 4) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'DRAFT',
  current_step_no INTEGER DEFAULT 1,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(tenant_id, order_number)
);

CREATE TABLE IF NOT EXISTS public.subcontract_order_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.subcontract_orders(id) ON DELETE CASCADE,
  route_step_id UUID,
  sequence_no INTEGER NOT NULL,
  node_key VARCHAR(80),
  parent_node_key VARCHAR(80),
  parent_order_step_id UUID,
  branch_no INTEGER DEFAULT 1,
  operation_name VARCHAR(255) NOT NULL,
  process_type VARCHAR(80) DEFAULT 'OUTSIDE_PROCESSING',
  vendor_id UUID,
  department VARCHAR(120),
  input_item_id UUID,
  output_item_id UUID,
  planned_input_qty NUMERIC(18, 4) DEFAULT 0,
  planned_output_qty NUMERIC(18, 4) DEFAULT 0,
  issued_qty NUMERIC(18, 4) DEFAULT 0,
  received_qty NUMERIC(18, 4) DEFAULT 0,
  accepted_qty NUMERIC(18, 4) DEFAULT 0,
  rejected_qty NUMERIC(18, 4) DEFAULT 0,
  scrap_qty NUMERIC(18, 4) DEFAULT 0,
  unused_return_qty NUMERIC(18, 4) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'WAITING',
  processing_rate NUMERIC(18, 4) DEFAULT 0,
  processing_amount NUMERIC(18, 2) DEFAULT 0,
  tax_percent NUMERIC(8, 3) DEFAULT 0,
  tax_amount NUMERIC(18, 2) DEFAULT 0,
  payable_amount NUMERIC(18, 2) DEFAULT 0,
  paid_amount NUMERIC(18, 2) DEFAULT 0,
  invoice_number VARCHAR(120),
  invoice_date DATE,
  invoice_status VARCHAR(30) DEFAULT 'NOT_RECEIVED',
  payment_reference VARCHAR(120),
  payment_date DATE,
  issued_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, order_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS public.subcontract_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.subcontract_orders(id) ON DELETE CASCADE,
  order_step_id UUID REFERENCES public.subcontract_order_steps(id) ON DELETE CASCADE,
  movement_type VARCHAR(40) NOT NULL,
  item_id UUID,
  quantity NUMERIC(18, 4) DEFAULT 0,
  warehouse_id UUID,
  vendor_id UUID,
  reference_number VARCHAR(80),
  document_number VARCHAR(80),
  external_reference VARCHAR(120),
  from_warehouse_id UUID,
  to_warehouse_id UUID,
  consumed_qty NUMERIC(18, 4) DEFAULT 0,
  accepted_qty NUMERIC(18, 4) DEFAULT 0,
  rejected_qty NUMERIC(18, 4) DEFAULT 0,
  scrap_qty NUMERIC(18, 4) DEFAULT 0,
  unused_return_qty NUMERIC(18, 4) DEFAULT 0,
  processing_rate NUMERIC(18, 4) DEFAULT 0,
  processing_amount NUMERIC(18, 2) DEFAULT 0,
  tax_percent NUMERIC(8, 3) DEFAULT 0,
  tax_amount NUMERIC(18, 2) DEFAULT 0,
  payable_amount NUMERIC(18, 2) DEFAULT 0,
  invoice_number VARCHAR(120),
  invoice_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subcontract_routes_tenant ON public.subcontract_routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subcontract_steps_route ON public.subcontract_route_steps(route_id);
CREATE INDEX IF NOT EXISTS idx_subcontract_orders_tenant ON public.subcontract_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subcontract_order_steps_order ON public.subcontract_order_steps(order_id);
CREATE INDEX IF NOT EXISTS idx_subcontract_movements_order ON public.subcontract_movements(order_id);

ALTER TABLE public.subcontract_routes ADD COLUMN IF NOT EXISTS consumption_per_output_qty NUMERIC(18, 4) DEFAULT 0;
ALTER TABLE public.subcontract_routes ADD COLUMN IF NOT EXISTS expected_consumption_qty NUMERIC(18, 4) DEFAULT 0;
ALTER TABLE public.subcontract_routes ADD COLUMN IF NOT EXISTS expected_unused_qty NUMERIC(18, 4) DEFAULT 0;
ALTER TABLE public.subcontract_route_steps ADD COLUMN IF NOT EXISTS node_key VARCHAR(80);
ALTER TABLE public.subcontract_route_steps ADD COLUMN IF NOT EXISTS parent_node_key VARCHAR(80);
ALTER TABLE public.subcontract_route_steps ADD COLUMN IF NOT EXISTS branch_no INTEGER DEFAULT 1;
ALTER TABLE public.subcontract_route_steps ADD COLUMN IF NOT EXISTS default_input_qty NUMERIC(18, 4) DEFAULT 0;
ALTER TABLE public.subcontract_route_steps ADD COLUMN IF NOT EXISTS default_output_qty NUMERIC(18, 4) DEFAULT 0;
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS node_key VARCHAR(80);
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS parent_node_key VARCHAR(80);
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS parent_order_step_id UUID;
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS branch_no INTEGER DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_subcontract_route_steps_parent ON public.subcontract_route_steps(route_id, parent_node_key);
CREATE INDEX IF NOT EXISTS idx_subcontract_order_steps_parent ON public.subcontract_order_steps(order_id, parent_order_step_id);
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS document_number VARCHAR(80);
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS external_reference VARCHAR(120);
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS from_warehouse_id UUID;
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS to_warehouse_id UUID;
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS consumed_qty NUMERIC(18, 4) DEFAULT 0;
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS accepted_qty NUMERIC(18, 4) DEFAULT 0;
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS rejected_qty NUMERIC(18, 4) DEFAULT 0;
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS scrap_qty NUMERIC(18, 4) DEFAULT 0;
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS unused_return_qty NUMERIC(18, 4) DEFAULT 0;
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS processing_rate NUMERIC(18, 4) DEFAULT 0;
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS processing_amount NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(8, 3) DEFAULT 0;
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS payable_amount NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(120);
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS invoice_date DATE;
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(30) DEFAULT 'NOT_RECEIVED';
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(120);
ALTER TABLE public.subcontract_order_steps ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS processing_rate NUMERIC(18, 4) DEFAULT 0;
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS processing_amount NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(8, 3) DEFAULT 0;
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS payable_amount NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(120);
ALTER TABLE public.subcontract_movements ADD COLUMN IF NOT EXISTS invoice_date DATE;
`;

    try {
      await this.executeSql(sql);
      return { success: true, message: 'Subcontracting tables created successfully' };
    } catch (error) {
      console.error('Subcontracting Migration error:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  async createHRPerformanceTables() {
    const sql = `
CREATE TABLE IF NOT EXISTS public.kpi_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID NOT NULL,
  kpi_name VARCHAR(160) NOT NULL, kpi_category VARCHAR(80) NOT NULL,
  description TEXT, measurement_type VARCHAR(40) NOT NULL DEFAULT 'PERCENTAGE',
  min_value NUMERIC(14,4) DEFAULT 0, max_value NUMERIC(14,4) DEFAULT 100,
  threshold_excellent NUMERIC(14,4), threshold_good NUMERIC(14,4), threshold_acceptable NUMERIC(14,4),
  auto_calculate BOOLEAN DEFAULT false, calculation_formula TEXT, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.kpi_definitions ADD COLUMN IF NOT EXISTS kpi_code VARCHAR(80);
ALTER TABLE public.kpi_definitions ADD COLUMN IF NOT EXISTS direction VARCHAR(30) NOT NULL DEFAULT 'HIGHER_IS_BETTER';
ALTER TABLE public.kpi_definitions ADD COLUMN IF NOT EXISTS target_value NUMERIC(14,4);
ALTER TABLE public.kpi_definitions ADD COLUMN IF NOT EXISTS weight NUMERIC(8,3) NOT NULL DEFAULT 1;
ALTER TABLE public.kpi_definitions ADD COLUMN IF NOT EXISTS review_frequency VARCHAR(30) NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE public.kpi_definitions ADD COLUMN IF NOT EXISTS effective_from DATE;
ALTER TABLE public.kpi_definitions ADD COLUMN IF NOT EXISTS effective_to DATE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_kpi_definition_tenant_code ON public.kpi_definitions(tenant_id, kpi_code) WHERE kpi_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.merit_demerit_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID NOT NULL,
  type_name VARCHAR(160) NOT NULL, record_type VARCHAR(20) NOT NULL,
  category VARCHAR(80) NOT NULL, description TEXT, default_points NUMERIC(12,2) DEFAULT 0,
  severity VARCHAR(30), requires_approval BOOLEAN DEFAULT true, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.merit_demerit_types ADD COLUMN IF NOT EXISTS type_code VARCHAR(80);
CREATE UNIQUE INDEX IF NOT EXISTS uq_merit_demerit_type_tenant_code ON public.merit_demerit_types(tenant_id, type_code) WHERE type_code IS NOT NULL;

ALTER TABLE public.employee_merits_demerits ADD COLUMN IF NOT EXISTS type_id UUID;
ALTER TABLE public.employee_merits_demerits ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL';
ALTER TABLE public.employee_merits_demerits ADD COLUMN IF NOT EXISTS evidence_reference TEXT;
ALTER TABLE public.employee_merits_demerits ADD COLUMN IF NOT EXISTS recorded_by UUID;
ALTER TABLE public.employee_merits_demerits ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.employee_merits_demerits ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.employee_merits_demerits ADD COLUMN IF NOT EXISTS approval_comment TEXT;
ALTER TABLE public.employee_merits_demerits ADD COLUMN IF NOT EXISTS voided_by UUID;
ALTER TABLE public.employee_merits_demerits ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE public.employee_merits_demerits ADD COLUMN IF NOT EXISTS void_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_employee_merits_status ON public.employee_merits_demerits(tenant_id, employee_id, status);

CREATE TABLE IF NOT EXISTS public.employee_kpi_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID NOT NULL, employee_id UUID NOT NULL,
  kpi_definition_id UUID, period_start DATE NOT NULL, period_end DATE NOT NULL,
  actual_value NUMERIC(14,4), calculated_score NUMERIC(8,2), result_band VARCHAR(30),
  source VARCHAR(20) NOT NULL DEFAULT 'MANUAL', status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  remarks TEXT, evidence_reference TEXT, prepared_by UUID, prepared_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID, approved_at TIMESTAMPTZ, approval_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employee_kpi_reviews_period ON public.employee_kpi_reviews(tenant_id, employee_id, period_start DESC, period_end DESC);

INSERT INTO public.kpi_definitions (tenant_id,kpi_code,kpi_name,kpi_category,description,measurement_type,target_value,threshold_excellent,threshold_good,threshold_acceptable,auto_calculate,review_frequency)
SELECT t.id, v.code, v.name, v.category, v.description, v.measurement, v.target, v.excellent, v.good, v.acceptable, v.auto, 'MONTHLY'
FROM public.tenants t CROSS JOIN (VALUES
 ('ATTENDANCE_COMPLIANCE','Attendance compliance','ATTENDANCE','Attendance days and authorised leave compliance','PERCENTAGE',100,98,95,90,true),
 ('PUNCTUALITY','Punctuality','ATTENDANCE','On-time reporting against shift policy','PERCENTAGE',100,98,95,90,true),
 ('QUALITY_OF_WORK','Quality of work','PERFORMANCE','Manager-assessed quality and rework control','PERCENTAGE',100,90,75,60,false),
 ('PRODUCTIVITY','Productivity','PERFORMANCE','Planned versus completed output','PERCENTAGE',100,90,75,60,false),
 ('SAFETY_COMPLIANCE','Safety & compliance','COMPLIANCE','Safety, policy and process compliance','PERCENTAGE',100,100,95,90,false)
) AS v(code,name,category,description,measurement,target,excellent,good,acceptable,auto)
WHERE NOT EXISTS (SELECT 1 FROM public.kpi_definitions k WHERE k.tenant_id=t.id AND k.kpi_code=v.code);

INSERT INTO public.merit_demerit_types (tenant_id,type_code,type_name,record_type,category,default_points,severity,requires_approval,description)
SELECT t.id,v.code,v.name,v.record_type,v.category,v.points,v.severity,true,v.description
FROM public.tenants t CROSS JOIN (VALUES
 ('PERFECT_ATTENDANCE','Perfect attendance','MERIT','ATTENDANCE',10,'LOW','Full attendance for the approved review period'),
 ('QUALITY_ACHIEVEMENT','Quality achievement','MERIT','PERFORMANCE',15,'MEDIUM','Recognised quality or improvement achievement'),
 ('SAFETY_RECOGNITION','Safety recognition','MERIT','COMPLIANCE',15,'MEDIUM','Recognised safety or compliance contribution'),
 ('UNAUTHORISED_ABSENCE','Unauthorised absence','DEMERIT','ATTENDANCE',-10,'MEDIUM','Absence without approved leave or authorisation'),
 ('REPEATED_LATE','Repeated late reporting','DEMERIT','ATTENDANCE',-5,'LOW','Repeated late reporting under the attendance policy'),
 ('QUALITY_NONCONFORMANCE','Quality non-conformance','DEMERIT','PERFORMANCE',-10,'MEDIUM','Confirmed avoidable quality non-conformance'),
 ('SAFETY_VIOLATION','Safety violation','DEMERIT','COMPLIANCE',-20,'HIGH','Confirmed safety or compliance violation')
) AS v(code,name,record_type,category,points,severity,description)
WHERE NOT EXISTS (SELECT 1 FROM public.merit_demerit_types m WHERE m.tenant_id=t.id AND m.type_code=v.code);
`;
    try {
      await this.executeSql(sql);
      return { success: true, message: 'HR performance controls created and SAP-aligned defaults loaded' };
    } catch (error) {
      console.error('HR performance migration error:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }
}
