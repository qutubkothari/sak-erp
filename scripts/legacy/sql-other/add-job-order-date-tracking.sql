-- Migration: Add Job Order Date Tracking and Assignment
-- Purpose: Track actual start dates, partial delivery dates, and job assignments
-- Date: 2026-03-03

-- 1. Add assigned_to field for job scheduling
ALTER TABLE production_job_orders
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(200);

-- Create index for assigned_to for faster queries
CREATE INDEX IF NOT EXISTS idx_job_orders_assigned_to ON production_job_orders(assigned_to);

-- 2. Create partial deliveries tracking table
CREATE TABLE IF NOT EXISTS job_order_partial_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_order_id UUID NOT NULL REFERENCES production_job_orders(id) ON DELETE CASCADE,
  delivery_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quantity DECIMAL(10,2) NOT NULL,
  delivered_by UUID REFERENCES users(id),
  delivered_by_name VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Create indexes for partial deliveries
CREATE INDEX IF NOT EXISTS idx_partial_deliveries_tenant ON job_order_partial_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_partial_deliveries_job_order ON job_order_partial_deliveries(job_order_id);
CREATE INDEX IF NOT EXISTS idx_partial_deliveries_date ON job_order_partial_deliveries(delivery_date);

-- 3. Create a view to calculate days taken for job orders
CREATE OR REPLACE VIEW job_order_completion_metrics AS
SELECT 
  jo.id,
  jo.tenant_id,
  jo.job_order_number,
  jo.item_code,
  jo.item_name,
  jo.quantity,
  jo.completed_quantity,
  jo.status,
  jo.start_date AS planned_start_date,
  jo.end_date AS planned_end_date,
  jo.actual_start_date,
  jo.actual_end_date,
  jo.assigned_to,
  jo.assigned_to_name,
  -- Calculate planned duration in days
  CASE 
    WHEN jo.end_date IS NOT NULL AND jo.start_date IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (jo.end_date - jo.start_date)) / 86400 
    ELSE NULL 
  END AS planned_duration_days,
  -- Calculate actual duration in days (from start to completion)
  CASE 
    WHEN jo.actual_end_date IS NOT NULL AND jo.actual_start_date IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (jo.actual_end_date - jo.actual_start_date)) / 86400 
    ELSE NULL 
  END AS actual_duration_days,
  -- Calculate variance (actual - planned)
  CASE 
    WHEN jo.actual_end_date IS NOT NULL AND jo.actual_start_date IS NOT NULL 
         AND jo.end_date IS NOT NULL AND jo.start_date IS NOT NULL 
    THEN (EXTRACT(EPOCH FROM (jo.actual_end_date - jo.actual_start_date)) / 86400) -
         (EXTRACT(EPOCH FROM (jo.end_date - jo.start_date)) / 86400)
    ELSE NULL 
  END AS duration_variance_days,
  -- Count of partial deliveries
  (SELECT COUNT(*) FROM job_order_partial_deliveries pd WHERE pd.job_order_id = jo.id) AS partial_delivery_count,
  -- First partial delivery date
  (SELECT MIN(delivery_date) FROM job_order_partial_deliveries pd WHERE pd.job_order_id = jo.id) AS first_delivery_date,
  -- Last partial delivery date
  (SELECT MAX(delivery_date) FROM job_order_partial_deliveries pd WHERE pd.job_order_id = jo.id) AS last_delivery_date,
  -- Days from start to first delivery
  CASE
    WHEN jo.actual_start_date IS NOT NULL AND 
         (SELECT MIN(delivery_date) FROM job_order_partial_deliveries pd WHERE pd.job_order_id = jo.id) IS NOT NULL
    THEN EXTRACT(EPOCH FROM (
      (SELECT MIN(delivery_date) FROM job_order_partial_deliveries pd WHERE pd.job_order_id = jo.id) - jo.actual_start_date
    )) / 86400
    ELSE NULL
  END AS days_to_first_delivery,
  jo.created_at,
  jo.updated_at
FROM production_job_orders jo;

-- Add comments for documentation
COMMENT ON TABLE job_order_partial_deliveries IS 'Tracks partial deliveries of job orders with timestamps';
COMMENT ON COLUMN production_job_orders.assigned_to IS 'User assigned to this job order for scheduling and accountability';
COMMENT ON COLUMN production_job_orders.assigned_to_name IS 'Cached name of assigned user for display';
COMMENT ON VIEW job_order_completion_metrics IS 'Calculates completion metrics including days taken, variance, and partial delivery tracking';

-- Add function to automatically update partial delivery on job order completion
CREATE OR REPLACE FUNCTION record_partial_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- When completed_quantity is increased, record it as a partial delivery
  IF NEW.completed_quantity > OLD.completed_quantity THEN
    INSERT INTO job_order_partial_deliveries (
      tenant_id,
      job_order_id,
      delivery_date,
      quantity,
      delivered_by,
      delivered_by_name,
      notes
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      NOW(),
      NEW.completed_quantity - OLD.completed_quantity,
      NULL, -- Will be populated by application
      NULL,
      'Automatically recorded from job order completion'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic partial delivery recording
DROP TRIGGER IF EXISTS trg_record_partial_delivery ON production_job_orders;
CREATE TRIGGER trg_record_partial_delivery
  AFTER UPDATE OF completed_quantity ON production_job_orders
  FOR EACH ROW
  WHEN (NEW.completed_quantity > OLD.completed_quantity)
  EXECUTE FUNCTION record_partial_delivery();

-- Grant permissions (adjust as needed)
-- GRANT SELECT ON job_order_completion_metrics TO authenticated;
-- GRANT ALL ON job_order_partial_deliveries TO authenticated;

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '✓ Added assigned_to columns to production_job_orders';
  RAISE NOTICE '✓ Created job_order_partial_deliveries table';
  RAISE NOTICE '✓ Created job_order_completion_metrics view';
  RAISE NOTICE '✓ Created automatic partial delivery recording trigger';
END $$;
