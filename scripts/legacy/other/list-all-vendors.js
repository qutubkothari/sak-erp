import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

async function listAllVendors() {
  console.log('\n=== ALL VENDORS IN DATABASE ===\n');

  // Get ALL vendors (active and inactive)
  const { data: allVendors, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching vendors:', error);
    return;
  }

  console.log(`Total vendors: ${allVendors.length}\n`);

  // Group by active status
  const activeVendors = allVendors.filter(v => v.is_active);
  const inactiveVendors = allVendors.filter(v => !v.is_active);

  console.log(`Active: ${activeVendors.length}`);
  console.log(`Inactive: ${inactiveVendors.length}\n`);

  // Show vendors starting with A
  const vendorsWithA = allVendors.filter(v => v.name.toUpperCase().startsWith('A'));
  console.log(`\n=== VENDORS STARTING WITH "A" ===\n`);
  console.log(`Total: ${vendorsWithA.length}\n`);
  
  vendorsWithA.forEach((vendor, index) => {
    const status = vendor.is_active ? '✅ ACTIVE' : '❌ INACTIVE';
    console.log(`${index + 1}. ${vendor.name} - ${status}`);
    console.log(`   Code: ${vendor.code || 'N/A'}`);
    console.log(`   Email: ${vendor.email || 'N/A'}`);
    console.log(`   Phone: ${vendor.phone || 'N/A'}`);
    console.log(`   ID: ${vendor.id}`);
    console.log('');
  });

  // Show all vendors for reference
  console.log('\n=== ALL VENDORS (First 20) ===\n');
  allVendors.slice(0, 20).forEach((vendor, index) => {
    const status = vendor.is_active ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${vendor.name} (${vendor.code || 'No Code'})`);
  });

  if (allVendors.length > 20) {
    console.log(`\n... and ${allVendors.length - 20} more vendors`);
  }
}

listAllVendors().catch(console.error);
