const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const appRoot = process.env.APP_ROOT || process.cwd();
const requireFromApp = createRequire(path.join(appRoot, 'package.json'));
const { Client } = requireFromApp('pg');

function readEnv(filePath) {
  const values = {};
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    values[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return values;
}

const envFile = process.env.ENV_FILE || path.join(appRoot, 'apps/api/.env.test');
const env = readEnv(envFile);
let connectionString = process.env.DATABASE_URL || env.DATABASE_URL;

if (!connectionString) {
  throw new Error(`DATABASE_URL missing from ${envFile}`);
}

const sql = `
CREATE TABLE IF NOT EXISTS public.import_files (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, import_number VARCHAR(60) NOT NULL,
 vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL, po_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
 status VARCHAR(40) NOT NULL DEFAULT 'DRAFT', currency VARCHAR(10) NOT NULL DEFAULT 'USD', customs_exchange_rate NUMERIC(15,6), incoterm VARCHAR(20),
 shipment_reference VARCHAR(160), bill_of_entry_number VARCHAR(120), bill_of_entry_date DATE, port_of_entry VARCHAR(160), expected_arrival_date DATE,
 commercial_invoice_number VARCHAR(120), commercial_invoice_date DATE, assessable_value_inr NUMERIC(15,2) NOT NULL DEFAULT 0,
 bcd_amount NUMERIC(15,2) NOT NULL DEFAULT 0, sws_amount NUMERIC(15,2) NOT NULL DEFAULT 0, import_igst_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
 recoverable_igst BOOLEAN NOT NULL DEFAULT TRUE, final_landed_cost NUMERIC(15,2) NOT NULL DEFAULT 0, notes TEXT,
 created_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(tenant_id, import_number)
);
ALTER TABLE public.import_files DROP CONSTRAINT IF EXISTS import_files_status_check;
ALTER TABLE public.import_files ADD CONSTRAINT import_files_status_check CHECK (status IN ('DRAFT','IN_TRANSIT','AT_PORT','CLEARED','GRN_POSTED','LANDED_COST_PENDING','LANDED_COST_POSTED','CLOSED','CANCELLED'));
CREATE TABLE IF NOT EXISTS public.import_file_costs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, import_file_id UUID NOT NULL REFERENCES public.import_files(id) ON DELETE CASCADE,
 cost_type VARCHAR(50) NOT NULL, supplier_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL, document_number VARCHAR(120), cost_date DATE,
 currency VARCHAR(10) NOT NULL DEFAULT 'INR', exchange_rate NUMERIC(15,6) NOT NULL DEFAULT 1, foreign_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
 inr_amount NUMERIC(15,2) NOT NULL DEFAULT 0, recoverable_tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0, allocation_basis VARCHAR(30) NOT NULL DEFAULT 'VALUE',
 notes TEXT, created_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.import_file_documents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, import_file_id UUID NOT NULL REFERENCES public.import_files(id) ON DELETE CASCADE,
 document_type VARCHAR(50) NOT NULL, file_name TEXT NOT NULL, file_url TEXT NOT NULL, notes TEXT, uploaded_by UUID, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.import_file_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, import_file_id UUID NOT NULL REFERENCES public.import_files(id) ON DELETE CASCADE,
 event_type VARCHAR(60) NOT NULL, description TEXT NOT NULL, reference_type VARCHAR(40), reference_id UUID, created_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.import_file_grns (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, import_file_id UUID NOT NULL REFERENCES public.import_files(id) ON DELETE CASCADE,
 grn_id UUID NOT NULL REFERENCES public.grns(id) ON DELETE RESTRICT, allocation_basis VARCHAR(30) NOT NULL DEFAULT 'VALUE',
 allocated_landed_cost NUMERIC(15,2) NOT NULL DEFAULT 0, status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ALLOCATION', created_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(tenant_id, import_file_id, grn_id)
);
CREATE TABLE IF NOT EXISTS public.import_file_grn_allocations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, import_file_id UUID NOT NULL REFERENCES public.import_files(id) ON DELETE CASCADE,
 import_file_grn_id UUID NOT NULL REFERENCES public.import_file_grns(id) ON DELETE CASCADE, grn_id UUID NOT NULL REFERENCES public.grns(id) ON DELETE RESTRICT,
 grn_item_id UUID, item_id UUID, item_code TEXT, item_name TEXT, received_qty NUMERIC(15,3) NOT NULL DEFAULT 0,
 base_rate NUMERIC(15,2) NOT NULL DEFAULT 0, base_value NUMERIC(15,2) NOT NULL DEFAULT 0, allocated_landed_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
 landed_unit_cost NUMERIC(15,4) NOT NULL DEFAULT 0, allocation_basis VARCHAR(30) NOT NULL DEFAULT 'VALUE',
 created_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.import_file_payments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, import_file_id UUID NOT NULL REFERENCES public.import_files(id) ON DELETE CASCADE,
 supplier_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL, payment_category VARCHAR(50) NOT NULL, document_number VARCHAR(120), currency VARCHAR(10) NOT NULL DEFAULT 'INR',
 exchange_rate NUMERIC(15,6) NOT NULL DEFAULT 1, foreign_amount NUMERIC(15,2) NOT NULL DEFAULT 0, inr_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
 status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL', payment_date DATE, payment_reference VARCHAR(160), notes TEXT,
 created_by UUID, approved_by UUID, approved_at TIMESTAMPTZ, paid_by UUID, paid_at TIMESTAMPTZ, reversed_by UUID, reversed_at TIMESTAMPTZ, reversal_reason TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.import_file_payments DROP CONSTRAINT IF EXISTS import_file_payments_status_check;
ALTER TABLE public.import_file_payments ADD CONSTRAINT import_file_payments_status_check CHECK (status IN ('PENDING_APPROVAL','APPROVED','PAID','REVERSED'));
CREATE INDEX IF NOT EXISTS idx_import_files_tenant_status ON public.import_files(tenant_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_events_file ON public.import_file_events(tenant_id,import_file_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_grns_file ON public.import_file_grns(tenant_id,import_file_id);
CREATE INDEX IF NOT EXISTS idx_import_allocations_file ON public.import_file_grn_allocations(tenant_id,import_file_id);
CREATE INDEX IF NOT EXISTS idx_import_payments_file ON public.import_file_payments(tenant_id,import_file_id);
NOTIFY pgrst, 'reload schema';
`;

(async () => {
  connectionString = connectionString.replace(/[?&]sslmode=require\b/, '');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log('Import purchase schema applied');
})().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
