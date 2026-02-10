const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVendorAddresses() {
  const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

  console.log('\n=== Checking for vendors with Saif\'s address ===\n');

  // Check for vendors with Saif's address patterns
  const { data: suspiciousVendors, error: error1 } = await supabase
    .from('vendors')
    .select('id, code, name, address, city, state, pincode, gstin')
    .eq('tenant_id', tenantId)
    .or('address.ilike.%SAIF%,address.ilike.%Nasscom%,address.ilike.%Rushikonda%,city.ilike.%Visakhapatnam%');

  if (error1) {
    console.error('Error fetching suspicious vendors:', error1);
  } else {
    console.log(`Found ${suspiciousVendors.length} vendors with Saif-related addresses:\n`);
    suspiciousVendors.forEach((vendor, idx) => {
      console.log(`${idx + 1}. ${vendor.name} (${vendor.code})`);
      console.log(`   Address: ${vendor.address}`);
      console.log(`   City: ${vendor.city}, State: ${vendor.state}, Pin: ${vendor.pincode}`);
      console.log(`   GSTIN: ${vendor.gstin || 'N/A'}`);
      console.log('');
    });
  }

  console.log('\n=== Sample of all vendor addresses ===\n');

  // Get a sample of all vendors
  const { data: allVendors, error: error2 } = await supabase
    .from('vendors')
    .select('code, name, address, city, state')
    .eq('tenant_id', tenantId)
    .order('name')
    .limit(20);

  if (error2) {
    console.error('Error fetching all vendors:', error2);
  } else {
    console.log(`Showing first 20 vendors (out of total):\n`);
    allVendors.forEach((vendor, idx) => {
      const addressPreview = vendor.address ? vendor.address.substring(0, 60) : 'N/A';
      console.log(`${idx + 1}. ${vendor.name} (${vendor.code})`);
      console.log(`   Address: ${addressPreview}${vendor.address && vendor.address.length > 60 ? '...' : ''}`);
      console.log(`   City: ${vendor.city || 'N/A'}`);
      console.log('');
    });
  }

  // Count total vendors
  const { count, error: error3 } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  if (error3) {
    console.error('Error counting vendors:', error3);
  } else {
    console.log(`\nTotal vendors in database: ${count}`);
  }
}

checkVendorAddresses().catch(console.error);
