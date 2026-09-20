// Fix BX992 BOM - Convert SG2 from ITEM to BOM component
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function fixBX992BOM() {
  try {
    console.log('🔍 Finding BX992 BOM and SG2 BOM...');
    
    // Find BX992 BOM (FG1)
    const { data: bx992Bom } = await supabase
      .from('bom_headers')
      .select('id, item:items!bom_headers_item_id_fkey(code)')
      .eq('items.code', 'FG1')
      .single();
    
    if (!bx992Bom) {
      console.error('❌ Could not find BX992 BOM (FG1)');
      return;
    }
    console.log(`✓ Found BX992 BOM: ${bx992Bom.id}`);
    
    // Find SG2 item
    const { data: sg2Item } = await supabase
      .from('items')
      .select('id')
      .eq('code', 'SG2')
      .single();
    
    if (!sg2Item) {
      console.error('❌ Could not find SG2 item');
      return;
    }
    console.log(`✓ Found SG2 Item: ${sg2Item.id}`);
    
    // Find SG2 BOM
    const { data: sg2Bom } = await supabase
      .from('bom_headers')
      .select('id')
      .eq('item_id', sg2Item.id)
      .single();
    
    if (!sg2Bom) {
      console.error('❌ Could not find SG2 BOM (Here3+GPS)');
      return;
    }
    console.log(`✓ Found SG2 BOM: ${sg2Bom.id}`);
    
    // Find the bom_item that needs fixing
    const { data: bomItem } = await supabase
      .from('bom_items')
      .select('id, component_type')
      .eq('bom_id', bx992Bom.id)
      .eq('item_id', sg2Item.id)
      .eq('component_type', 'ITEM')
      .single();
    
    if (!bomItem) {
      console.log('ℹ️  SG2 is already a BOM component or not found in BX992');
      return;
    }
    console.log(`✓ Found BOM item to fix: ${bomItem.id}`);
    
    // Update the component from ITEM to BOM
    console.log('🔧 Updating SG2 from ITEM to BOM component...');
    const { error } = await supabase
      .from('bom_items')
      .update({
        component_type: 'BOM',
        child_bom_id: sg2Bom.id,
        item_id: null,
      })
      .eq('id', bomItem.id);
    
    if (error) {
      console.error('❌ Update failed:', error);
      return;
    }
    
    console.log('✅ SUCCESS! SG2 is now a BOM component in BX992.');
    console.log('   Now when you generate PR, SG2 will explode into its child components.');
    
    // Verify
    const { data: verifyItems } = await supabase
      .from('bom_items')
      .select(`
        component_type,
        quantity,
        item:items(code, name),
        child_bom:bom_headers!bom_items_child_bom_id_fkey(
          id,
          item:items(code, name)
        )
      `)
      .eq('bom_id', bx992Bom.id);
    
    console.log('\n📋 BX992 BOM Structure:');
    verifyItems?.forEach((item, idx) => {
      const name = item.component_type === 'BOM' 
        ? `${item.child_bom?.item?.code} (BOM - will explode)` 
        : `${item.item?.code} (ITEM)`;
      console.log(`   ${idx + 1}. ${name} × ${item.quantity}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixBX992BOM();
