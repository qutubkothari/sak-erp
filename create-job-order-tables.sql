-- ============================================
-- CREATE UNIFIED JOB ORDER TABLES
-- Run this in Supabase SQL Editor
-- ============================================

-- Create job order status enum
DO $$ BEGIN
  CREATE TYPE job_order_status AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'ON_HOLD'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create operation status enum
DO $$ BEGIN
  CREATE TYPE operation_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'ON_HOLD',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Main job orders table
CREATE TABLE IF NOT EXISTS production_job_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_order_number VARCHAR(50) UNIQUE NOT NULL,
  item_id UUID NOT NULL REFERENCES items(id),
  item_code VARCHAR(50) NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  bom_id UUID REFERENCES bom_headers(id),
  quantity DECIMAL(10,2) NOT NULL,
  completed_quantity DECIMAL(10,2) DEFAULT 0,
  rejected_quantity DECIMAL(10,2) DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  actual_start_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  priority VARCHAR(20) DEFAULT 'NORMAL',
  status job_order_status DEFAULT 'DRAFT',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_job_order_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Job order operations (workstation assignments with all details)
CREATE TABLE IF NOT EXISTS job_order_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_order_id UUID NOT NULL REFERENCES production_job_orders(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  operation_name VARCHAR(100) NOT NULL,
  workstation_id UUID NOT NULL REFERENCES work_stations(id),
  workstation_name VARCHAR(100),
  assigned_user_id UUID REFERENCES users(id),
  assigned_user_name VARCHAR(100),
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  actual_start_datetime TIMESTAMPTZ,
  actual_end_datetime TIMESTAMPTZ,
  expected_duration_hours DECIMAL(6,2),
  actual_duration_hours DECIMAL(6,2),
  setup_time_hours DECIMAL(6,2) DEFAULT 0,
  accepted_variation_percent DECIMAL(5,2) DEFAULT 0,
  completed_quantity DECIMAL(10,2) DEFAULT 0,
  rejected_quantity DECIMAL(10,2) DEFAULT 0,
  status operation_status DEFAULT 'NOT_STARTED',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_job_operation_sequence UNIQUE (job_order_id, sequence_number)
);

-- Job order materials (components to be issued)
CREATE TABLE IF NOT EXISTS job_order_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_order_id UUID NOT NULL REFERENCES production_job_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  item_code VARCHAR(50) NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  required_quantity DECIMAL(10,2) NOT NULL,
  issued_quantity DECIMAL(10,2) DEFAULT 0,
  returned_quantity DECIMAL(10,2) DEFAULT 0,
  warehouse_id UUID REFERENCES warehouses(id),
  warehouse_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job order quality inspections
CREATE TABLE IF NOT EXISTS job_order_quality (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_order_operation_id UUID NOT NULL REFERENCES job_order_operations(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES users(id),
  inspector_name VARCHAR(100),
  inspection_datetime TIMESTAMPTZ DEFAULT NOW(),
  accepted_quantity DECIMAL(10,2) DEFAULT 0,
  rejected_quantity DECIMAL(10,2) DEFAULT 0,
  inspection_status VARCHAR(20) DEFAULT 'PENDING',
  defect_types TEXT[],
  remarks TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_orders_tenant ON production_job_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_orders_status ON production_job_orders(status);
CREATE INDEX IF NOT EXISTS idx_job_orders_item ON production_job_orders(item_id);
CREATE INDEX IF NOT EXISTS idx_job_orders_dates ON production_job_orders(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_job_operations_job_order ON job_order_operations(job_order_id);
CREATE INDEX IF NOT EXISTS idx_job_operations_workstation ON job_order_operations(workstation_id);
CREATE INDEX IF NOT EXISTS idx_job_operations_user ON job_order_operations(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_job_order ON job_order_materials(job_order_id);
CREATE INDEX IF NOT EXISTS idx_job_quality_operation ON job_order_quality(job_order_operation_id);

-- Function to generate job order number
CREATE OR REPLACE FUNCTION generate_job_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  year_str VARCHAR(4);
  month_str VARCHAR(2);
BEGIN
  year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
  month_str := TO_CHAR(CURRENT_DATE, 'MM');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(job_order_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM production_job_orders
  WHERE job_order_number LIKE 'JO-' || year_str || '-' || month_str || '-%'
    AND tenant_id = NEW.tenant_id;
  
  NEW.job_order_number := 'JO-' || year_str || '-' || month_str || '-' || LPAD(next_num::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate job order number
DROP TRIGGER IF EXISTS trg_generate_job_order_number ON production_job_orders;
CREATE TRIGGER trg_generate_job_order_number
  BEFORE INSERT ON production_job_orders
  FOR EACH ROW
  WHEN (NEW.job_order_number IS NULL OR NEW.job_order_number = '')
  EXECUTE FUNCTION generate_job_order_number();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_job_orders_updated_at ON production_job_orders;
CREATE TRIGGER trg_job_orders_updated_at
  BEFORE UPDATE ON production_job_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_job_operations_updated_at ON job_order_operations;
CREATE TRIGGER trg_job_operations_updated_at
  BEFORE UPDATE ON job_order_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_job_materials_updated_at ON job_order_materials;
CREATE TRIGGER trg_job_materials_updated_at
  BEFORE UPDATE ON job_order_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verification queries
SELECT 'production_job_orders table' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_job_orders')
  THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

SELECT 'job_order_operations table' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_order_operations')
  THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

SELECT 'job_order_materials table' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_order_materials')
  THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

SELECT 'job_order_quality table' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_order_quality')
  THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Success message
SELECT '✅✅✅ JOB ORDER TABLES CREATED SUCCESSFULLY! ✅✅✅' as result;
