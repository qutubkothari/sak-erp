import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const TENANT_ID = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n============================================================');
console.log('VERIFYING ITEM CATEGORIES');
console.log('============================================================\n');

// Get sample items by type and category
const { data: items } = await supabase
  .from('items')
  .select('code, name, type, category')
  .eq('tenant_id', TENANT_ID)
  .in('type', ['SUB_ASSEMBLY', 'RAW_MATERIAL'])
  .order('type', { ascending: false })
  .order('name')
  .limit(20);

console.log('Sample items:\n');

let currentType = null;
items.forEach(item => {
  if (item.type !== currentType) {
    currentType = item.type;
    console.log(`\n${item.type}:`);
  }
  console.log(`  ${item.name}`);
  console.log(`    Code: ${item.code}, Category: ${item.category}`);
});

// Get counts by type and category
const { data: allItems } = await supabase
  .from('items')
  .select('type, category')
  .eq('tenant_id', TENANT_ID);

const counts = {};
allItems.forEach(item => {
  const key = `${item.type} - ${item.category || 'null'}`;
  counts[key] = (counts[key] || 0) + 1;
});

console.log('\n============================================================');
console.log('Category Summary:');
console.log('============================================================\n');

Object.entries(counts)
  .sort()
  .forEach(([key, count]) => {
    console.log(`${key}: ${count} items`);
  });

console.log();
