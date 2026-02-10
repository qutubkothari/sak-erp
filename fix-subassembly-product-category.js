import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);

const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

async function fixProductCategory() {
  console.log('============================================================');
  console.log('FIXING SUB_ASSEMBLY PRODUCT_CATEGORY');
  console.log('============================================================\n');

  // Get all SUB_ASSEMBLY items
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, code, type, category, product_category')
    .eq('tenant_id', tenantId)
    .eq('type', 'SUB_ASSEMBLY');

  if (error) {
    console.error('Error fetching items:', error);
    return;
  }

  console.log(`Found ${items.length} SUB_ASSEMBLY items\n`);
  
  console.log('Current product_category distribution:');
  const categoryCount = {};
  items.forEach(item => {
    const cat = item.product_category || 'null';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  Object.entries(categoryCount).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} items`);
  });
  console.log();

  // Update all SUB_ASSEMBLY items to have product_category = "SUB ASSEMBLIES"
  const { data: updated, error: updateError } = await supabase
    .from('items')
    .update({ product_category: 'SUB ASSEMBLIES' })
    .eq('tenant_id', tenantId)
    .eq('type', 'SUB_ASSEMBLY')
    .select();

  if (updateError) {
    console.error('Error updating items:', updateError);
    return;
  }

  console.log(`✅ Successfully updated ${updated.length} items to product_category "SUB ASSEMBLIES"\n`);

  // Verify the update
  const { data: verifyItems } = await supabase
    .from('items')
    .select('id, name, code, type, category, product_category')
    .eq('tenant_id', tenantId)
    .eq('type', 'SUB_ASSEMBLY');

  console.log('New product_category distribution:');
  const newCategoryCount = {};
  verifyItems.forEach(item => {
    const cat = item.product_category || 'null';
    newCategoryCount[cat] = (newCategoryCount[cat] || 0) + 1;
  });
  Object.entries(newCategoryCount).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} items`);
  });
  console.log();

  // Show sample
  console.log('Sample updated items (showing 10):');
  verifyItems.slice(0, 10).forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.name} (${item.code})`);
    console.log(`   type: "${item.type}"`);
    console.log(`   category: "${item.category}"`);
    console.log(`   product_category: "${item.product_category}"`);
    console.log();
  });

  console.log('============================================================');
  console.log('✅ DONE! Frontend "SUB ASSEMBLIES" filter should now work');
  console.log('============================================================');
}

fixProductCategory();
