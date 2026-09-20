const pg = require('pg');

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.nwkaruzvzwwuftjquypk:qGc7cVmxzFQZzG6f@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
});

const sql = `
CREATE TABLE IF NOT EXISTS public.bom_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  bom_id UUID NOT NULL,
  operation_sequence INTEGER NOT NULL,
  operation_name VARCHAR(255),
  workstation_id UUID,
  cycle_time DECIMAL(10, 2),
  setup_time DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bom_routing_bom_id ON public.bom_routing(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_routing_tenant_id ON public.bom_routing(tenant_id);
`;

async function createTable() {
  try {
    await client.connect();
    console.log('Connected to Supabase database...');
    
    await client.query(sql);
    
    console.log('✅ BOM routing table created successfully');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating BOM routing table:', err.message);
    process.exit(1);
  }
}

createTable();

