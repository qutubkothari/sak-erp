const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMetadata() {
  const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

  console.log('\n=== Checking metadata field for original addresses ===\n');

  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('name, code, metadata')
    .eq('tenant_id', tenantId)
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    vendors.forEach((vendor, idx) => {
      console.log(`\n${idx + 1}. ${vendor.name} (${vendor.code})`);
      console.log('   Metadata:', JSON.stringify(vendor.metadata, null, 2));
    });
  }
}

checkMetadata().catch(console.error);
