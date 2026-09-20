const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TENANT_ID = '1fe77ea9-e303-4d7b-9b95-6c7f693bbca8';

async function checkVendors() {
  console.log('Checking vendors in database...\n');
  
  const { data, error, count } = await supabase
    .from('vendors')
    .select('*', { count: 'exact' })
    .eq('tenant_id', TENANT_ID);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total vendors found: ${count}`);
  
  if (data && data.length > 0) {
    console.log('\nFirst 10 vendors:');
    data.slice(0, 10).forEach((v, i) => {
      console.log(`${i + 1}. ${v.name} (Code: ${v.code})`);
    });
  } else {
    console.log('\n❌ NO VENDORS FOUND IN DATABASE!');
    console.log('The import may have failed or data was inserted to a different tenant.');
  }
}

checkVendors();
