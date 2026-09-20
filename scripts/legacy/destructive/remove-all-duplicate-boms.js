import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const TENANT_ID = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n============================================================');
console.log('REMOVING ALL DUPLICATE BOMs');
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

// Get details for items with duplicates
const { data: items } = await supabase
  .from('items')
  .select('id, code, name, type')
  .eq('tenant_id', TENANT_ID)
  .in('id', itemsWithDuplicates);

let totalDeleted = 0;
let totalKept = 0;

for (const item of items) {
  const count = bomCounts[item.id];
  console.log(`\n${item.name} (${item.code})`);
  console.log(`  Found ${count} BOMs`);
  
  // Get all BOMs for this item, ordered by creation date
  const { data: boms } = await supabase
    .from('bom_headers')
    .select('id, version, is_active, created_at')
    .eq('tenant_id', TENANT_ID)
    .eq('item_id', item.id)
    .order('created_at', { ascending: true });
  
  // Keep the first one (oldest), delete the rest
  const toKeep = boms[0];
  const toDelete = boms.slice(1);
  
  console.log(`  ✅ Keeping: Version ${toKeep.version}, Created: ${new Date(toKeep.created_at).toLocaleString()}`);
  totalKept++;
  
  for (const bom of toDelete) {
    // Delete BOM items (ignore tenant_id error since that column doesn't exist)
    await supabase
      .from('bom_items')
      .delete()
      .eq('bom_id', bom.id);
    
    // Delete BOM header
    const { error: headerError } = await supabase
      .from('bom_headers')
      .delete()
      .eq('tenant_id', TENANT_ID)
      .eq('id', bom.id);
    
    if (headerError) {
      console.log(`  ❌ Error deleting BOM: ${headerError.message}`);
    } else {
      totalDeleted++;
    }
  }
  
  if (toDelete.length > 0) {
    console.log(`  🗑️  Deleted ${toDelete.length} duplicate(s)`);
  }
}

console.log('\n============================================================');
console.log(`✅ CLEANUP COMPLETE`);
console.log(`   Kept: ${totalKept} BOMs`);
console.log(`   Deleted: ${totalDeleted} duplicate BOMs`);
console.log('============================================================\n');
