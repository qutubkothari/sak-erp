const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
 'https://wfhdzgovwhkrvvwlgsdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaGR6Z292d2hrcnZ2d2xnc2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzMwNTIwOCwiZXhwIjoyMDQ4ODgxMjA4fQ.Kd2oNiho4Kuf3cRs5LRYdkZOdTHs7eL5Hh_Oq-_7LoE'
);

async function checkData() {
  // Check items
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, code, name, type')
    .limit(5);
  
  console.log('\n=== ITEMS ===');
  if (itemsError) {
    console.log('Error:', itemsError);
  } else {
    console.log(`Found ${items?.length || 0} items (showing first 5):`);
    items?.forEach(item => console.log(`  - ${item.code}: ${item.name} (${item.type})`));
  }
  
  // Check BOMs
  const { data: boms, error: bomsError } = await supabase
    .from('bom_headers')
    .select('*')
    .limit(5);
  
  console.log('\n=== BOM HEADERS ===');
  if (bomsError) {
    console.log('Error:', bomsError);
  } else {
    console.log(`Found ${boms?.length || 0} BOM headers`);
    if (boms && boms.length > 0) {
      console.log('Sample BOM:', JSON.stringify(boms[0], null, 2));
    }
  }
}

checkData();
