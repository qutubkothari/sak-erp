const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkGRN() {
  const { data, error } = await supabase
    .from('grn_items')
    .select('id, item_code, item_name, item_id')
    .eq('grn_id', '0343be5e-77e0-4b32-9e85-a8ac7578c707');

  console.log('GRN items:', JSON.stringify(data, null, 2));

  // Also update any missing item_ids
  if (data) {
    for (const item of data) {
      if (!item.item_id) {
        const { data: itemData } = await supabase
          .from('items')
          .select('id')
          .eq('code', item.item_code)
          .single();

        if (itemData) {
          await supabase
            .from('grn_items')
            .update({ item_id: itemData.id })
            .eq('id', item.id);
          console.log(`Updated item_id for ${item.item_code}`);
        }
      }
    }
  }
}

checkGRN();