import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const TENANT_ID = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n============================================================');
console.log('VERIFYING KANGAROO BOMs AFTER RE-IMPORT');
console.log('============================================================\n');

// Get Kangaroo-related items
const { data: items, error: itemsError } = await supabase
  .from('items')
  .select('id, code, name, type')
  .eq('tenant_id', TENANT_ID)
  .ilike('name', '%kangaroo%')
  .order('type', { ascending: false })
  .order('name');

if (itemsError) {
  console.error('Error fetching items:', itemsError);
  process.exit(1);
}

console.log(`Found ${items.length} Kangaroo-related items:\n`);

for (const item of items) {
  console.log(`${item.name} (${item.code}) - ${item.type}`);
  
  // Get BOMs for this item
  const { data: boms, count } = await supabase
    .from('bom_headers')
    .select('id, version, is_active', { count: 'exact' })
    .eq('tenant_id', TENANT_ID)
    .eq('item_id', item.id);
  
  if (boms && boms.length > 0) {
    console.log(`  ✅ ${boms.length} BOM(s):`);
    for (const bom of boms) {
      // Get component count
      const { count: componentCount } = await supabase
        .from('bom_items')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', TENANT_ID)
        .eq('bom_id', bom.id);
      
      console.log(`     - Version ${bom.version}, Active: ${bom.is_active}, Components: ${componentCount}`);
    }
  } else {
    console.log(`  ❌ No BOMs`);
  }
  console.log();
}

console.log('============================================================');
console.log('SUMMARY');
console.log('============================================================\n');

// Key assemblies that should have BOMs
const keyAssemblies = [
  { name: 'Kangaroo box PORT Assy', code: 'KANGAROOBOXPORTA' },
  { name: 'Kangaroo box STBD Assy', code: 'KANGAROOBOXSTBDA' },
  { name: 'Kangaroo Box Preprocessing Assy', code: 'KANGAROOBOXPREPR' }
];

let allGood = true;
for (const assembly of keyAssemblies) {
  const item = items.find(i => i.code === assembly.code);
  if (!item) {
    console.log(`❌ ${assembly.name}: ITEM NOT FOUND`);
    allGood = false;
    continue;
  }
  
  const { count } = await supabase
    .from('bom_headers')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
    .eq('item_id', item.id);
  
  if (count > 0) {
    console.log(`✅ ${assembly.name}: ${count} BOM(s)`);
  } else {
    console.log(`❌ ${assembly.name}: NO BOMs`);
    allGood = false;
  }
}

// Check RAW_MATERIAL Kangaroo Box - should have 0 BOMs
const rawMaterialItem = items.find(i => i.code === 'FAB-IJM-Kangaroo-Box');
if (rawMaterialItem) {
  const { count } = await supabase
    .from('bom_headers')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
    .eq('item_id', rawMaterialItem.id);
  
  if (count === 0) {
    console.log(`✅ Kangaroo Box (RAW_MATERIAL): 0 BOMs (correct - raw materials shouldn't have BOMs)`);
  } else {
    console.log(`❌ Kangaroo Box (RAW_MATERIAL): ${count} BOMs (should be 0!)`);
    allGood = false;
  }
}

console.log();
if (allGood) {
  console.log('🎉 ALL KANGAROO BOMs CORRECT!');
} else {
  console.log('⚠️  SOME ISSUES FOUND');
}
console.log();
