import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const TENANT_ID = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n============================================================');
console.log('CHECKING ALL DUPLICATE BOMs');
console.log('============================================================\n');

// Get all items that have BOMs
const { data: allBoms } = await supabase
  .from('bom_headers')
  .select('item_id')
  .eq('tenant_id', TENANT_ID);

// Count BOMs per item
const bomCounts = {};
allBoms.forEach(bom => {
  bomCounts[bom.item_id] = (bomCounts[bom.item_id] || 0) + 1;
});

// Find items with duplicates
const itemsWithDuplicates = Object.entries(bomCounts)
  .filter(([_, count]) => count > 1)
  .map(([itemId]) => itemId);

console.log(`Total items with BOMs: ${Object.keys(bomCounts).length}`);
console.log(`Items with duplicate BOMs: ${itemsWithDuplicates.length}\n`);

if (itemsWithDuplicates.length === 0) {
  console.log('✅ No duplicate BOMs found!\n');
  process.exit(0);
}

console.log('Items with duplicate BOMs:\n');

// Get details for items with duplicates
const { data: items } = await supabase
  .from('items')
  .select('id, code, name, type')
  .eq('tenant_id', TENANT_ID)
  .in('id', itemsWithDuplicates);

for (const item of items) {
  const count = bomCounts[item.id];
  console.log(`${item.name} (${item.code}) - ${item.type}`);
  console.log(`  🔢 ${count} BOMs`);
  
  // Show BOM creation dates
  const { data: boms } = await supabase
    .from('bom_headers')
    .select('id, version, created_at')
    .eq('tenant_id', TENANT_ID)
    .eq('item_id', item.id)
    .order('created_at', { ascending: true });
  
  boms.forEach((bom, idx) => {
    const time = new Date(bom.created_at).toLocaleString();
    console.log(`     ${idx + 1}. Version ${bom.version} - ${time}`);
  });
  console.log();
}

console.log('============================================================');
console.log(`Total items with duplicates: ${itemsWithDuplicates.length}`);
console.log('============================================================\n');
