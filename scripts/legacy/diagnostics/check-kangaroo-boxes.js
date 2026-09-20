/**
 * Check Kangaroo Box assemblies status
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKangarooBoxes() {
  console.log('\n============================================================');
  console.log('CHECKING KANGAROO BOX ASSEMBLIES');
  console.log('============================================================\n');

  const targetCodes = ['KANGAROOBOXPORTA', 'KANGAROOBOXSTBDA'];

  for (const code of targetCodes) {
    console.log(`\n🔍 Checking: ${code}`);
    console.log('─────────────────────────────────────────────────────────');

    // Check if item exists
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('code', code)
      .maybeSingle();

    if (itemError) {
      console.error(`  ❌ Error fetching item: ${itemError.message}`);
      continue;
    }

    if (!item) {
      console.log(`  ❌ Item not found in database`);
      continue;
    }

    console.log(`  ✅ Item exists:`);
    console.log(`     ID: ${item.id}`);
    console.log(`     Name: ${item.name}`);
    console.log(`     Type: ${item.type}`);
    console.log(`     Category: ${item.category}`);

    // Check for BOM
    const { data: boms, error: bomError } = await supabase
      .from('bom_headers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('item_id', item.id)
      .eq('is_active', true);

    if (bomError) {
      console.error(`  ❌ Error fetching BOM: ${bomError.message}`);
      continue;
    }

    if (!boms || boms.length === 0) {
      console.log(`  ❌ NO BOM FOUND - This is why it can't be auto-created!`);
      console.log(`     → Sub-assemblies need a BOM to be auto-created`);
      continue;
    }

    console.log(`  ✅ BOM exists: ${boms.length} version(s)`);
    const bom = boms[0];
    console.log(`     BOM ID: ${bom.id}`);
    console.log(`     Version: ${bom.version}`);

    // Get BOM items separately
    const { data: bomItems, error: bomItemsError } = await supabase
      .from('bom_items')
      .select(`
        *,
        child_item:items!bom_items_item_id_fkey(code, name, type)
      `)
      .eq('bom_header_id', bom.id);

    if (bomItemsError) {
      console.error(`  ❌ Error fetching BOM items: ${bomItemsError.message}`);
    } else {
      console.log(`     Components: ${bomItems?.length || 0}`);

      if (bomItems && bomItems.length > 0) {
        console.log(`\n     📦 Components:`);
        bomItems.forEach((comp, idx) => {
          console.log(`       ${idx + 1}. ${comp.child_item?.code || 'Unknown'} - ${comp.child_item?.name || 'Unknown'}`);
          console.log(`          Quantity: ${comp.quantity}, Type: ${comp.child_item?.type}`);
        });
      }
    }

    // Check stock
    const { data: stock, error: stockError } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('item_id', item.id);

    if (stockError) {
      console.error(`  ⚠️  Error fetching stock: ${stockError.message}`);
    } else if (!stock || stock.length === 0) {
      console.log(`  ⚠️  No stock records (expected for sub-assemblies)`);
    } else {
      const totalQty = stock.reduce((sum, s) => sum + parseFloat(s.quantity || 0), 0);
      console.log(`  📊 Current stock: ${totalQty} units`);
    }
  }

  // Check if there's a parent BOM that includes these
  console.log('\n\n🔎 Checking parent BOMs that reference Kangaroo boxes...');
  console.log('─────────────────────────────────────────────────────────');

  const { data: items } = await supabase
    .from('items')
    .select('id, code, name')
    .eq('tenant_id', tenantId)
    .in('code', targetCodes);

  if (items && items.length > 0) {
    const itemIds = items.map(i => i.id);

    const { data: parentBoms } = await supabase
      .from('bom_items')
      .select(`
        *,
        bom_header:bom_headers!inner(
          id,
          item_id,
          version,
          parent_item:items!bom_headers_item_id_fkey(code, name, type)
        )
      `)
      .eq('bom_header.tenant_id', tenantId)
      .in('item_id', itemIds);

    if (parentBoms && parentBoms.length > 0) {
      console.log(`\n  Found in ${parentBoms.length} parent BOM(s):`);
      parentBoms.forEach(pb => {
        console.log(`    • ${pb.bom_header?.parent_item?.code || 'Unknown'} - ${pb.bom_header?.parent_item?.name || 'Unknown'}`);
      });
    } else {
      console.log(`  ⚠️  Not found in any parent BOMs`);
    }
  }

  console.log('\n============================================================\n');
}

checkKangarooBoxes();
