import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

async function checkDeletedVendors() {
  console.log('\n=== Checking Deleted Vendors ===\n');

  // Check for vendors with is_active = false
  const { data: deletedVendors, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', false)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching deleted vendors:', error);
    return;
  }

  console.log(`Total deleted vendors: ${deletedVendors.length}\n`);

  if (deletedVendors.length === 0) {
    console.log('No deleted vendors found.');
    return;
  }

  // Show all deleted vendors
  console.log('=== ALL DELETED VENDORS ===\n');
  deletedVendors.forEach((vendor, index) => {
    console.log(`${index + 1}. ${vendor.name}`);
    console.log(`   Code: ${vendor.code || 'N/A'}`);
    console.log(`   Email: ${vendor.email || 'N/A'}`);
    console.log(`   Phone: ${vendor.phone || 'N/A'}`);
    console.log(`   ID: ${vendor.id}`);
    console.log('');
  });

  // Find vendors starting with "A"
  const vendorsStartingWithA = deletedVendors.filter(v => v.name.toUpperCase().startsWith('A'));
  
  console.log('\n=== DELETED VENDORS STARTING WITH "A" ===\n');
  if (vendorsStartingWithA.length === 0) {
    console.log('No deleted vendors starting with "A" found.');
  } else {
    console.log(`Found ${vendorsStartingWithA.length} deleted vendor(s) starting with "A":\n`);
    vendorsStartingWithA.forEach((vendor, index) => {
      console.log(`${index + 1}. ${vendor.name}`);
      console.log(`   Code: ${vendor.code || 'N/A'}`);
      console.log(`   Email: ${vendor.email || 'N/A'}`);
      console.log(`   Phone: ${vendor.phone || 'N/A'}`);
      console.log(`   ID: ${vendor.id}`);
      console.log('');
    });

    console.log('\n=== RESTORING VENDORS ===\n');
    
    for (const vendor of vendorsStartingWithA) {
      const { error: updateError } = await supabase
        .from('vendors')
        .update({ is_active: true })
        .eq('id', vendor.id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        console.log(`❌ Failed to restore: ${vendor.name}`);
        console.error('   Error:', updateError.message);
      } else {
        console.log(`✅ Restored: ${vendor.name}`);
      }
    }

    console.log('\n=== COMPLETED ===');
    console.log(`Successfully restored ${vendorsStartingWithA.length} vendor(s) starting with "A"`);
  }
}

checkDeletedVendors().catch(console.error);
