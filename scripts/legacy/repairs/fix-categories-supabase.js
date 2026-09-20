require('dotenv').config({ path: 'apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

async function fixCategories() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Fixing categories in items table...');

  // Fix Raw Material
  let { error: err1 } = await supabase
    .from('items')
    .update({ category: 'RAW_MATERIAL' })
    .ilike('category', '%RAW MATERIALS%');
  console.log('Update RAW MATERIALS', err1 ? err1.message : 'OK');

  let { error: err2 } = await supabase
    .from('items')
    .update({ category: 'RAW_MATERIAL' })
    .ilike('category', '%Raw Material%');
  console.log('Update Raw Material', err2 ? err2.message : 'OK');

  let { error: err3 } = await supabase
    .from('items')
    .update({ category: 'RAW_MATERIAL' })
    .ilike('category', '%COMPONENT%');
  console.log('Update COMPONENT', err3 ? err3.message : 'OK');

  let { error: err4 } = await supabase
    .from('items')
    .update({ category: 'CAPITAL_GOODS' })
    .ilike('category', '%Capital Goods%');
  console.log('Update Capital Goods', err4 ? err4.message : 'OK');

  let { error: err5 } = await supabase
    .from('items')
    .update({ category: 'CONSUMABLE' })
    .ilike('category', '%Consumable%');
  console.log('Update Consumable', err5 ? err5.message : 'OK');

  let { error: err6 } = await supabase
    .from('items')
    .update({ category: 'PACKING_MATERIAL' })
    .ilike('category', '%Packing Material%');
  console.log('Update Packing Material', err6 ? err6.message : 'OK');

  let { error: err7 } = await supabase
    .from('items')
    .update({ category: 'SERVICES' })
    .in('category', ['SERVICE', 'Services']);
  console.log('Update SERVICES', err7 ? err7.message : 'OK');

  console.log('Updating item_category_options...');
  // Delete all and re-seed
  let { error: delErr } = await supabase.from('item_category_options').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Delete old categories', delErr ? delErr.message : 'OK');

  // get distinct tenant_ids
  const { data: tenants } = await supabase.from('users').select('tenant_id').not('tenant_id', 'is', null);
  const distinctTenants = [...new Set(tenants.map(t => t.tenant_id))];

  const defaultCategories = [
    'RAW_MATERIAL',
    'CAPITAL_GOODS',
    'CONSUMABLE',
    'PACKING_MATERIAL',
    'SERVICES',
  ];

  for (const tenantId of distinctTenants) {
    const toInsert = defaultCategories.map(name => ({ tenant_id: tenantId, name }));
    const { error: insErr } = await supabase.from('item_category_options').insert(toInsert);
    console.log(`Inserted categories for tenant ${tenantId}`, insErr ? insErr.message : 'OK');
  }

  console.log('Done!');
}

fixCategories().catch(console.error);
