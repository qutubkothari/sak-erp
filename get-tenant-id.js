require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function getTenantId() {
  const { data, error } = await supabase
    .from('grns')
    .select('tenant_id, received_by, vendor_id')
    .eq('grn_number', 'GRN-2026-01-001')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Tenant ID:', data.tenant_id);
  console.log('Received By (User ID):', data.received_by);
  console.log('Vendor ID:', data.vendor_id);
}

getTenantId();
