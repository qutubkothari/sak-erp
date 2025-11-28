-- Create departments table for organization structure
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    manager_id UUID,
    parent_department_id UUID REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_departments_tenant ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(tenant_id, is_active);

-- Insert standard manufacturing departments
INSERT INTO departments (tenant_id, name, code, description, is_active) 
SELECT 
    t.id as tenant_id,
    dept.name,
    dept.code,
    dept.description,
    true
FROM tenants t
CROSS JOIN (
    VALUES 
        ('Production', 'PROD', 'Manufacturing and production operations'),
        ('Quality Control', 'QC', 'Quality assurance and testing'),
        ('Maintenance', 'MAINT', 'Equipment and facility maintenance'),
        ('Engineering', 'ENG', 'Product design and engineering'),
        ('Procurement', 'PROC', 'Purchasing and vendor management'),
        ('Warehouse', 'WH', 'Inventory and warehouse operations'),
        ('Planning', 'PLAN', 'Production planning and scheduling'),
        ('R&D', 'RND', 'Research and development'),
        ('Sales', 'SALES', 'Sales and customer relations'),
        ('Logistics', 'LOG', 'Shipping and logistics'),
        ('HR', 'HR', 'Human resources'),
        ('Finance', 'FIN', 'Finance and accounting'),
        ('IT', 'IT', 'Information technology')
) AS dept(name, code, description)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Disable RLS for easier access
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
GRANT ALL ON departments TO authenticated, service_role, anon;
