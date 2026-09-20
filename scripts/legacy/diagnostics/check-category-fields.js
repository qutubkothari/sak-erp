import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

async function checkCategoryFields() {
  console.log('\n=== Checking CATEGORY vs PRODUCT_CATEGORY ===\n');
  
  const { data: items, error } = await supabase
    .from('items')
    .select('id, code, name, type, category, product_category')
    .eq('tenant_id', tenantId)
    .eq('type', 'SUB_ASSEMBLY')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('First 10 SUB_ASSEMBLY items:');
  console.log('CODE | CATEGORY | PRODUCT_CATEGORY | NAME');
  console.log('-'.repeat(100));
  items.forEach(item => {
    console.log(`${item.code} | "${item.category || 'NULL'}" | "${item.product_category || 'NULL'}" | ${item.name}`);
  });

  // Get unique values for category field
  const { data: allItems } = await supabase
    .from('items')
    .select('category, product_category, type')
    .eq('tenant_id', tenantId);

  const categoryValues = [...new Set(allItems.map(i => i.category || 'NULL'))].sort();
  const productCategoryValues = [...new Set(allItems.map(i => i.product_category || 'NULL'))].sort();

  console.log('\n=== UNIQUE VALUES ===\n');
  console.log('CATEGORY field values:');
  categoryValues.forEach(cat => {
    const count = allItems.filter(i => (i.category || 'NULL') === cat).length;
    console.log(`  "${cat}": ${count} items`);
  });

  console.log('\nPRODUCT_CATEGORY field values:');
  productCategoryValues.forEach(cat => {
    const count = allItems.filter(i => (i.product_category || 'NULL') === cat).length;
    console.log(`  "${cat}": ${count} items`);
  });

  console.log('\n=== RECOMMENDATION ===');
  console.log('You have TWO category systems which is confusing!');
  console.log('Option 1: Use only PRODUCT_CATEGORY and remove CATEGORY dropdown');
  console.log('Option 2: Use only CATEGORY and remove PRODUCT_CATEGORY dropdown');
  console.log('Option 3: Rename dropdowns to be clearer (e.g., "Item Type" vs "Product Category")');
}

checkCategoryFields();
