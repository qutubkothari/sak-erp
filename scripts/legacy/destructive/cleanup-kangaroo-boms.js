/**
 * Clean up duplicate Kangaroo Box BOMs and re-import correctly
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDuplicateKangarooBOMs() {
  console.log('\n============================================================');
  console.log('CLEANING UP DUPLICATE KANGAROO BOMs');
  console.log('============================================================\n');

  // 1. Delete all BOMs for "Kangaroo Box" (RAW_MATERIAL) - it shouldn't have BOMs!
  const { data: kangarooBoxItem } = await supabase
    .from('items')
    .select('id, code, name, type')
    .eq('tenant_id', tenantId)
    .eq('code', 'FAB-IJM-Kangaroo-Box')
    .single();

  if (kangarooBoxItem) {
    console.log(`Found: ${kangarooBoxItem.name} (${kangarooBoxItem.type})`);
    
    const { data: boms } = await supabase
      .from('bom_headers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('item_id', kangarooBoxItem.id);

    if (boms && boms.length > 0) {
      console.log(`  Found ${boms.length} BOMs attached to this RAW_MATERIAL (should be 0!)`);
      
      for (const bom of boms) {
        // Delete BOM items first
        const { error: itemsError } = await supabase
          .from('bom_items')
          .delete()
          .eq('bom_header_id', bom.id);

        if (itemsError) {
          console.error(`  ❌ Error deleting BOM items: ${itemsError.message}`);
        }

        // Delete BOM header
        const { error: headerError } = await supabase
          .from('bom_headers')
          .delete()
          .eq('id', bom.id);

        if (headerError) {
          console.error(`  ❌ Error deleting BOM header: ${headerError.message}`);
        } else {
          console.log(`  ✅ Deleted BOM ${bom.id}`);
        }
      }
    } else {
      console.log(`  No BOMs found (already clean)`);
    }
  }

  // 2. Delete BOMs for Kangaroo PORT and STBD boxes (we'll re-import  with correct matching)
  const targetItems = [
    { code: 'KANGAROOBOXPORTA', name: 'Kangaroo box PORT Assy' },
    { code: 'KANGAROOBOXSTBDA', name: 'Kangaroo box STBD Assy' },
    { code: 'KANGAROOBOXPREPR', name: 'Kangaroo Box Preprocessing Assy' }
  ];

  for (const target of targetItems) {
    const { data: item } = await supabase
      .from('items')
      .select('id, code, name')
      .eq('tenant_id', tenantId)
      .eq('code', target.code)
      .single();

    if (!item) {
      console.log(`\n⚠️  ${target.name} not found`);
      continue;
    }

    const { data: boms } = await supabase
      .from('bom_headers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('item_id', item.id);

    console.log(`\n${item.name} (${item.code}): ${boms?.length || 0} BOMs`);

    if (boms && boms.length > 0) {
      for (const bom of boms) {
        // Delete BOM items
        await supabase
          .from('bom_items')
          .delete()
          .eq('bom_header_id', bom.id);

        // Delete BOM header
        const { error } = await supabase
          .from('bom_headers')
          .delete()
          .eq('id', bom.id);

        if (error) {
          console.error(`  ❌ Error deleting BOM: ${error.message}`);
        } else {
          console.log(`  ✅ Deleted old BOM ${bom.id} (will be re-imported with correct data)`);
        }
      }
    }
  }

  console.log('\n============================================================');
  console.log('✅ CLEANUP COMPLETE');
  console.log('============================================================');
  console.log('\nNext step: Run import-bom-list.js to re-import BOMs with correct matching\n');
}

cleanupDuplicateKangarooBOMs();
