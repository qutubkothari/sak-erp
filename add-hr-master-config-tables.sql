-- Add HR Master Configuration Tables for KPI Definitions and Merit/Demerit Types

-- KPI Definitions Table (Master Configuration)
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kpi_name VARCHAR(255) NOT NULL,
  kpi_category VARCHAR(100) NOT NULL, -- 'ATTENDANCE', 'QUALITY', 'PRODUCTIVITY', 'BEHAVIOR', 'CUSTOM'
  description TEXT,
  measurement_type VARCHAR(50) NOT NULL, -- 'PERCENTAGE', 'NUMBER', 'SCORE', 'COUNT'
  min_value DECIMAL(10, 2) DEFAULT 0,
  max_value DECIMAL(10, 2) DEFAULT 100,
  threshold_excellent DECIMAL(10, 2), -- Values above this = excellent
  threshold_good DECIMAL(10, 2), -- Values above this = good
  threshold_acceptable DECIMAL(10, 2), -- Values above this = acceptable
  auto_calculate BOOLEAN DEFAULT FALSE, -- Can system auto-calculate this?
  calculation_formula TEXT, -- Formula or description for calculation
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kpi_definitions_tenant ON kpi_definitions(tenant_id);
CREATE INDEX idx_kpi_definitions_category ON kpi_definitions(kpi_category);

-- Merit/Demerit Types Table (Master Configuration)
CREATE TABLE IF NOT EXISTS merit_demerit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type_name VARCHAR(255) NOT NULL,
  record_type VARCHAR(20) NOT NULL CHECK (record_type IN ('MERIT', 'DEMERIT')),
  category VARCHAR(100) NOT NULL, -- 'ATTENDANCE', 'QUALITY', 'BEHAVIOR', 'SAFETY', 'PRODUCTIVITY', 'CUSTOM'
  description TEXT,
  default_points INTEGER DEFAULT 0, -- Default point value (positive for merits, negative for demerits)
  severity VARCHAR(20), -- For demerits: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  requires_approval BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_merit_demerit_types_tenant ON merit_demerit_types(tenant_id);
CREATE INDEX idx_merit_demerit_types_record_type ON merit_demerit_types(record_type);
CREATE INDEX idx_merit_demerit_types_category ON merit_demerit_types(category);

-- Add reference to merit_demerit_types in existing employee_merits_demerits table
ALTER TABLE employee_merits_demerits 
ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES merit_demerit_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employee_merits_demerits_type ON employee_merits_demerits(type_id);

-- Insert default KPI definitions
INSERT INTO kpi_definitions (tenant_id, kpi_name, kpi_category, description, measurement_type, max_value, threshold_excellent, threshold_good, threshold_acceptable, auto_calculate) 
SELECT id, 'Attendance Rate', 'ATTENDANCE', 'Percentage of days present vs total working days', 'PERCENTAGE', 100, 98, 95, 90, TRUE FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO kpi_definitions (tenant_id, kpi_name, kpi_category, description, measurement_type, max_value, threshold_excellent, threshold_good, threshold_acceptable, auto_calculate) 
SELECT id, 'Punctuality Score', 'ATTENDANCE', 'Percentage of on-time arrivals', 'PERCENTAGE', 100, 95, 85, 75, TRUE FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO kpi_definitions (tenant_id, kpi_name, kpi_category, description, measurement_type, max_value, threshold_excellent, threshold_good, threshold_acceptable, auto_calculate) 
SELECT id, 'Quality of Work', 'QUALITY', 'Subjective assessment of work quality', 'SCORE', 100, 90, 75, 60, FALSE FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO kpi_definitions (tenant_id, kpi_name, kpi_category, description, measurement_type, max_value, threshold_excellent, threshold_good, threshold_acceptable, auto_calculate) 
SELECT id, 'Productivity Score', 'PRODUCTIVITY', 'Tasks completed vs assigned', 'SCORE', 100, 90, 75, 60, FALSE FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO kpi_definitions (tenant_id, kpi_name, kpi_category, description, measurement_type, max_value, threshold_excellent, threshold_good, threshold_acceptable, auto_calculate) 
SELECT id, 'Teamwork Rating', 'BEHAVIOR', 'Collaboration and team contribution', 'SCORE', 100, 85, 70, 55, FALSE FROM tenants
ON CONFLICT DO NOTHING;

-- Insert default merit types
INSERT INTO merit_demerit_types (tenant_id, type_name, record_type, category, description, default_points) 
SELECT id, 'Perfect Attendance', 'MERIT', 'ATTENDANCE', 'No absences for the month', 10 FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO merit_demerit_types (tenant_id, type_name, record_type, category, description, default_points) 
SELECT id, 'Excellent Quality', 'MERIT', 'QUALITY', 'Work quality exceeds expectations', 15 FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO merit_demerit_types (tenant_id, type_name, record_type, category, description, default_points) 
SELECT id, 'Innovation', 'MERIT', 'PRODUCTIVITY', 'Suggested process improvement or innovation', 20 FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO merit_demerit_types (tenant_id, type_name, record_type, category, description, default_points) 
SELECT id, 'Exceptional Customer Service', 'MERIT', 'BEHAVIOR', 'Outstanding customer service feedback', 15 FROM tenants
ON CONFLICT DO NOTHING;

-- Insert default demerit types
INSERT INTO merit_demerit_types (tenant_id, type_name, record_type, category, description, default_points, severity) 
SELECT id, 'Unexcused Absence', 'DEMERIT', 'ATTENDANCE', 'Absent without prior approval', -10, 'MEDIUM' FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO merit_demerit_types (tenant_id, type_name, record_type, category, description, default_points, severity) 
SELECT id, 'Late Arrival (>30 min)', 'DEMERIT', 'ATTENDANCE', 'Arrived more than 30 minutes late', -5, 'LOW' FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO merit_demerit_types (tenant_id, type_name, record_type, category, description, default_points, severity) 
SELECT id, 'Quality Issue', 'DEMERIT', 'QUALITY', 'Work did not meet quality standards', -15, 'HIGH' FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO merit_demerit_types (tenant_id, type_name, record_type, category, description, default_points, severity) 
SELECT id, 'Safety Violation', 'DEMERIT', 'SAFETY', 'Failed to follow safety protocols', -20, 'CRITICAL' FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO merit_demerit_types (tenant_id, type_name, record_type, category, description, default_points, severity) 
SELECT id, 'Unprofessional Conduct', 'DEMERIT', 'BEHAVIOR', 'Behavior not aligned with company values', -10, 'MEDIUM' FROM tenants
ON CONFLICT DO NOTHING;

-- Add workflow_history table for documents
CREATE TABLE IF NOT EXISTS document_workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'CREATED', 'FORWARDED_TO_STAFF', 'RETURNED_TO_ADMIN', 'FORWARDED_TO_MANAGER', 'SENT_TO_CLIENT', 'APPROVED', 'REJECTED'
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  actor_name VARCHAR(255), -- Name of person who performed the action
  actor_email VARCHAR(255), -- Email of person who performed the action
  recipient_name VARCHAR(255), -- If forwarded, who it was sent to
  recipient_email VARCHAR(255),
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_document_workflow_history_tenant ON document_workflow_history(tenant_id);
CREATE INDEX idx_document_workflow_history_document ON document_workflow_history(document_id);
CREATE INDEX idx_document_workflow_history_created_at ON document_workflow_history(created_at DESC);

COMMENT ON TABLE kpi_definitions IS 'Master configuration for KPI metrics that can be tracked for employees';
COMMENT ON TABLE merit_demerit_types IS 'Master configuration for standardized merit and demerit types';
COMMENT ON TABLE document_workflow_history IS 'Audit trail of all document workflow actions';
