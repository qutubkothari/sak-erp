import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const TENANT_ID = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n============================================================');
console.log('UPDATING SUB_ASSEMBLY ITEMS CATEGORY');
console.log('============================================================\n');

// Get all SUB_ASSEMBLY items
const { data: items, error: fetchError } = await supabase
  .from('items')
  .select('id, code, name, category')
  .eq('tenant_id', TENANT_ID)
  .eq('type', 'SUB_ASSEMBLY')
  .order('name');

if (fetchError) {
  console.error('Error fetching items:', fetchError);
  process.exit(1);
}

console.log(`Found ${items.length} SUB_ASSEMBLY items\n`);

// Count by current category
const categoryCounts = {};
items.forEach(item => {
  const cat = item.category || 'null';
  categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
});

console.log('Current category distribution:');
Object.entries(categoryCounts).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count} items`);
});
console.log();

// Update all to "Sub Assembly"
console.log('Updating all SUB_ASSEMBLY items to category "Sub Assembly"...\n');

const { data: updated, error: updateError } = await supabase
  .from('items')
  .update({ category: 'Sub Assembly' })
  .eq('tenant_id', TENANT_ID)
  .eq('type', 'SUB_ASSEMBLY')
  .select();

if (updateError) {
  console.error('Error updating items:', updateError);
  process.exit(1);
}

console.log(`✅ Successfully updated ${updated.length} items to category "Sub Assembly"`);

// Verify the update
const { data: verification } = await supabase
  .from('items')
  .select('category')
  .eq('tenant_id', TENANT_ID)
  .eq('type', 'SUB_ASSEMBLY');

const newCategoryCounts = {};
verification.forEach(item => {
  const cat = item.category || 'null';
  newCategoryCounts[cat] = (newCategoryCounts[cat] || 0) + 1;
});

console.log('\nNew category distribution:');
Object.entries(newCategoryCounts).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count} items`);
});

console.log('\n============================================================');
console.log('✅ UPDATE COMPLETE');
console.log('============================================================\n');
