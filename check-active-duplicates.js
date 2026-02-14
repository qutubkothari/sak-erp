import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

async function checkActiveDuplicates() {
  console.log('\n=== CHECKING ACTIVE VENDORS FOR DUPLICATES ===\n');

  const { data: activeVendors, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Group by normalized name
  const groups = {};
  activeVendors.forEach(vendor => {
    const normalized = vendor.name.trim().toUpperCase();
    if (!groups[normalized]) {
      groups[normalized] = [];
    }
    groups[normalized].push(vendor);
  });

  // Find duplicates
  const duplicates = Object.entries(groups).filter(([name, vendors]) => vendors.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ No active duplicates found!');
    console.log(`Total active vendors: ${activeVendors.length}`);
    return;
  }

  console.log(`❌ Found ${duplicates.length} duplicate groups among ACTIVE vendors:\n`);

  duplicates.forEach(([name, vendors]) => {
    console.log(`${name} (${vendors.length} entries):`);
    vendors.forEach((v, idx) => {
      const hasEmail = v.email ? '📧' : '  ';
      const hasPhone = v.phone ? '📱' : '  ';
      const hasContact = v.contact_person ? '👤' : '  ';
      console.log(`  ${idx + 1}. Code: ${v.code || 'N/A'.padEnd(10)} ${hasEmail}${hasPhone}${hasContact} | ${v.legal_name || v.name}`);
    });
    console.log('');
  });

  console.log('\n=== REMOVING DUPLICATES (keeping most complete) ===\n');

  for (const [name, vendors] of duplicates) {
    // Score each vendor
    const scored = vendors.map(v => ({
      vendor: v,
      score: (v.email ? 2 : 0) + (v.phone ? 2 : 0) + (v.contact_person ? 1 : 0) +
             (v.tax_id ? 1 : 0) + (v.legal_name && v.legal_name !== v.name ? 1 : 0) +
             (v.address ? 1 : 0)
    }));

    // Sort by score, then by created_at
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.vendor.created_at) - new Date(b.vendor.created_at);
    });

    const keep = scored[0].vendor;
    const remove = scored.slice(1).map(s => s.vendor);

    console.log(`${name}:`);
    console.log(`  ✅ KEEP: ${keep.code} (Score: ${scored[0].score})`);

    for (const removeVendor of remove) {
      console.log(`  ❌ DEACTIVATE: ${removeVendor.code}`);
      
      const { error: updateError } = await supabase
        .from('vendors')
        .update({ is_active: false })
        .eq('id', removeVendor.id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        console.log(`     ⚠️ Failed: ${updateError.message}`);
      }
    }
    console.log('');
  }

  console.log('\n=== COMPLETED ===');
  
  const { data: finalActive } = await supabase
    .from('vendors')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  console.log(`Final active vendor count: ${finalActive.length}`);
  console.log(`Duplicates cleaned: ${duplicates.length} groups`);
}

checkActiveDuplicates().catch(console.error);
