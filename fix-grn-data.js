require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkGRN() {
  console.log('Checking GRN: 0343be5e-77e0-4b32-9e85-a8ac7578c707');

  // First check if GRN exists
  const { data: grn, error: grnError } = await supabase
    .from('grn')
    .select('id, grn_number')
    .eq('id', '0343be5e-77e0-4b32-9e85-a8ac7578c707')
    .single();

  console.log('GRN exists:', !!grn, 'Error:', grnError);

  const { data, error } = await supabase
    .from('grn_items')
    .select('id, item_code, item_name, item_id')
    .eq('grn_id', '0343be5e-77e0-4b32-9e85-a8ac7578c707');

  console.log('Query error:', error);
  console.log('GRN items count:', data?.length || 0);
  console.log('GRN items:', JSON.stringify(data, null, 2));

  // Update missing item_ids
  if (data && data.length > 0) {
    for (const item of data) {
      if (!item.item_id) {
        console.log(`Fixing item: ${item.item_code}`);
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .select('id')
          .eq('code', item.item_code)
          .single();

        console.log(`Item lookup result:`, itemData, 'Error:', itemError);

        if (itemData) {
          const { error: updateError } = await supabase
            .from('grn_items')
            .update({ item_id: itemData.id })
            .eq('id', item.id);

          console.log(`Update result for ${item.item_code}:`, updateError ? 'ERROR' : 'SUCCESS');
        }
      } else {
        console.log(`Item ${item.item_code} already has item_id: ${item.item_id}`);
      }
    }
  }
}

checkGRN();