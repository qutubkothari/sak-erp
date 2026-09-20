const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wfhdzgovwhkrvvwlgsdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaGR6Z292d2hrcnZ2d2xnc2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzMwNTIwOCwiZXhwIjoyMDQ4ODgxMjA4fQ.Kd2oNiho4Kuf3cRs5LRYdkZOdTHs7eL5Hh_Oq-_7LoE'
);

async function testMinimalBomInsert() {
  const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
  
  // Get any item to use as test
  const { data: items } = await supabase
    .from('items')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .limit(1);
  
  if (!items || items.length === 0) {
    console.log('No items found');
    return;
  }
  
  const testItem = items[0];
  console.log('Using test item:', testItem.name);
  
  // Try inserting with absolute minimum fields
  const testData = {
    tenant_id: tenantId,
    item_id: testItem.id,
    version: 'TEST-1.0'
  };
  
  console.log('Attempting insert with:', testData);
  
  const { data, error } = await supabase
    .from('bom_headers')
    .insert(testData)
    .select();
  
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Success! BOM created:', data);
    
    // Clean up - delete the test BOM
    if (data && data[0]) {
      await supabase
        .from('bom_headers')
        .delete()
        .eq('id', data[0].id);
      console.log('Test BOM deleted');
    }
  }
}

testMinimalBomInsert();
