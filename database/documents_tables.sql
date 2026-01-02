-- Document Categories Table
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_document_categories_tenant ON document_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_active ON document_categories(is_active);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_number VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  document_type VARCHAR(50) NOT NULL,
  category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
  file_url TEXT,
  file_name VARCHAR(500) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  current_revision VARCHAR(50) DEFAULT '1.0',
  status VARCHAR(50) DEFAULT 'DRAFT',
  access_level VARCHAR(50) DEFAULT 'INTERNAL',
  tags TEXT[],
  related_entity_type VARCHAR(100),
  related_entity_id UUID,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  UNIQUE(tenant_id, document_number)
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);

-- Document Revisions Table
CREATE TABLE IF NOT EXISTS document_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  revision_number VARCHAR(50) NOT NULL,
  file_url TEXT,
  file_name VARCHAR(500) NOT NULL,
  file_size INTEGER,
  change_description TEXT,
  revision_type VARCHAR(50) DEFAULT 'MINOR',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_document_revisions_document ON document_revisions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_revisions_created ON document_revisions(created_at);

-- Insert default document categories
INSERT INTO document_categories (tenant_id, code, name, description) 
SELECT 
  t.id,
  'GENERAL',
  'General Documents',
  'General purpose documents'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM document_categories dc 
  WHERE dc.tenant_id = t.id AND dc.code = 'GENERAL'
);
