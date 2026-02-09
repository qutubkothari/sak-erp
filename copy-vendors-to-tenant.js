const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwkaruzvzwwuftjquypk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q'
);

const sourceTenantId = '1fe77ea9-e303-4d7b-9b95-6c7f693bbca8'; // Has 118 vendors
const targetTenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'; // Has 0 vendors

async function copyVendors() {
  console.log('\n=== Copying vendors between tenants ===\n');
  console.log('Source tenant:', sourceTenantId);
  console.log('Target tenant:', targetTenantId);
  console.log('');
  
  // Get vendors from source tenant
  console.log('Fetching vendors from source...');
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('tenant_id', sourceTenantId);
  
  if (error) {
    console.error('❌ Error fetching vendors:', error.message);
    throw error;
  }
  
  console.log(`✅ Found ${vendors.length} vendors in source tenant\n`);
  
  if (vendors.length === 0) {
    console.log('No vendors to copy!');
    return;
  }
  
  // Copy to target tenant
  console.log('Copying vendors to target tenant...');
  const vendorsToInsert = vendors.map(v => {
    const { id, created_at, updated_at, ...rest } = v;
    return {
      ...rest,
      tenant_id: targetTenantId
    };
  });
  
  const { data: inserted, error: insertError } = await supabase
    .from('vendors')
    .insert(vendorsToInsert)
    .select();
  
  if (insertError) {
    console.error('❌ Error inserting vendors:', insertError.message);
    throw insertError;
  }
  
  console.log(`✅ Successfully copied ${inserted.length} vendors to target tenant!`);
  console.log(`\nTarget tenant ${targetTenantId} now has vendors.\n`);
}

copyVendors()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
