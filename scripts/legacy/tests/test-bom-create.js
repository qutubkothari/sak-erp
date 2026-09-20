require('dotenv').config({ path: './deploy-temp/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const tenantId = process.env.DEFAULT_TENANT_ID;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const testBom = {
    tenant_id: tenantId,
    item_id: '0191dc1c-72e5-77ab-83c1-57b77d96c3ba', // Use an actual SUB_ASSEMBLY item ID
    version: 1, // INTEGER not string
    is_active: true,
    effective_from: new Date().toISOString(),
    notes: 'Test BOM creation'
  };

  console.log('Testing BOM creation with:', JSON.stringify(testBom, null, 2));

  const { data, error } = await supabase
    .from('bom_headers')
    .insert(testBom)
    .select()
    .single();

  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS:', data);
  }
}

test();
