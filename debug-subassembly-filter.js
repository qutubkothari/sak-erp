import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const TENANT_ID = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n============================================================');
console.log('DEBUGGING SUB_ASSEMBLY FILTER ISSUE');
console.log('============================================================\n');

// Get all SUB_ASSEMBLY items
const { data: items } = await supabase
  .from('items')
  .select('id, code, name, type, category, product_category')
  .eq('tenant_id', TENANT_ID)
  .eq('type', 'SUB_ASSEMBLY')
  .order('name')
  .limit(10);

console.log(`Found ${items.length} SUB_ASSEMBLY items:\n`);

items.forEach((item, idx) => {
  console.log(`${idx + 1}. ${item.name} (${item.code})`);
  console.log(`   type: "${item.type}"`);
  console.log(`   category: "${item.category}"`);
  console.log(`   product_category: ${item.product_category || 'null'}`);
  console.log();
});

// Check what the filter might be using
console.log('============================================================');
console.log('Checking possible filter fields:');
console.log('============================================================\n');

// Check if filter uses product_category
const { data: byProductCategory, count: pcCount } = await supabase
  .from('items')
  .select('*', { count: 'exact', head: true })
  .eq('tenant_id', TENANT_ID)
  .eq('product_category', 'SUB ASSEMBLIES');

console.log(`Items with product_category = "SUB ASSEMBLIES": ${pcCount || 0}`);

// Check if filter uses type
const { data: byType, count: typeCount } = await supabase
  .from('items')
  .select('*', { count: 'exact', head: true })
  .eq('tenant_id', TENANT_ID)
  .eq('type', 'SUB_ASSEMBLY');

console.log(`Items with type = "SUB_ASSEMBLY": ${typeCount || 0}`);

// Check all distinct product_category values
const { data: allItems } = await supabase
  .from('items')
  .select('product_category')
  .eq('tenant_id', TENANT_ID);

const productCategories = new Set();
allItems.forEach(item => {
  productCategories.add(item.product_category || 'null');
});

console.log('\nAll distinct product_category values:');
productCategories.forEach(cat => {
  const count = allItems.filter(i => (i.product_category || 'null') === cat).length;
  console.log(`  "${cat}": ${count} items`);
});

console.log('\n============================================================\n');
