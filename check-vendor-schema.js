const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVendorSchema() {
  const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

  console.log('\n=== Checking vendor table columns - Sample vendor data ===\n');

  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('tenant_id', tenantId)
    .limit(3);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample vendor records with ALL columns:');
    vendors.forEach((vendor, idx) => {
      console.log(`\n--- Vendor ${idx + 1}: ${vendor.name} ---`);
      Object.keys(vendor).forEach(key => {
        let value = vendor[key];
        if (typeof value === 'string' && value.length > 100) {
          value = value.substring(0, 100) + '...';
        }
        console.log(`  ${key}: ${value}`);
      });
    });
  }
}

checkVendorSchema().catch(console.error);
