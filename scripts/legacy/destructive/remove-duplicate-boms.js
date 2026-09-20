import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const TENANT_ID = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n============================================================');
console.log('REMOVING DUPLICATE KANGAROO BOMs');
console.log('============================================================\n');

// Get all Kangaroo-related items
const { data: items } = await supabase
  .from('items')
  .select('id, code, name, type')
  .eq('tenant_id', TENANT_ID)
  .eq('type', 'SUB_ASSEMBLY')
  .ilike('name', '%kangaroo%')
  .order('name');

console.log(`Found ${items.length} Kangaroo sub-assembly items\n`);

let totalDeleted = 0;

for (const item of items) {
  console.log(`\n${item.name} (${item.code})`);
  
  // Get all BOMs for this item, ordered by creation date
  const { data: boms } = await supabase
    .from('bom_headers')
    .select('id, version, is_active, created_at')
    .eq('tenant_id', TENANT_ID)
    .eq('item_id', item.id)
    .order('created_at', { ascending: true });
  
  if (!boms || boms.length <= 1) {
    console.log(`  ✅ Only ${boms?.length || 0} BOM(s) - no duplicates`);
    continue;
  }
  
  console.log(`  Found ${boms.length} BOMs`);
  
  // Keep the first one (oldest), delete the rest
  const toKeep = boms[0];
  const toDelete = boms.slice(1);
  
  console.log(`  ✅ Keeping: Version ${toKeep.version}, Created: ${toKeep.created_at}`);
  
  for (const bom of toDelete) {
    // First delete BOM items
    const { error: itemsError } = await supabase
      .from('bom_items')
      .delete()
      .eq('tenant_id', TENANT_ID)
      .eq('bom_id', bom.id);
    
    if (itemsError) {
      console.log(`  ⚠️  Error deleting BOM items: ${itemsError.message}`);
    }
    
    // Then delete BOM header
    const { error: headerError } = await supabase
      .from('bom_headers')
      .delete()
      .eq('tenant_id', TENANT_ID)
      .eq('id', bom.id);
    
    if (headerError) {
      console.log(`  ❌ Error deleting BOM ${bom.id}: ${headerError.message}`);
    } else {
      console.log(`  🗑️  Deleted: Version ${bom.version}, Created: ${bom.created_at}`);
      totalDeleted++;
    }
  }
}

console.log('\n============================================================');
console.log(`✅ CLEANUP COMPLETE - Deleted ${totalDeleted} duplicate BOMs`);
console.log('============================================================\n');
