const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwkaruzvzwwuftjquypk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q'
);

async function checkTenants() {
  console.log('\n=== Checking tenants and vendors ===\n');
  
  // Get all tenants
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('*');
  
  if (tenantsError) {
    console.error('Error fetching tenants:', tenantsError);
    return;
  }
  
  console.log(`Total tenants: ${tenants.length}\n`);
  
  for (const tenant of tenants) {
    console.log(`Tenant: ${tenant.name}`);
    console.log(`ID: ${tenant.id}`);
    console.log(`---`);
    
    // Count vendors for this tenant
    const { count, error } = await supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id);
    
    if (!error) {
      console.log(`Vendors: ${count || 0}\n`);
    }
  }
}

checkTenants()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
