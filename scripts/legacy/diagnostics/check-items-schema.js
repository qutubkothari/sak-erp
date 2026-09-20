const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wfhdzgovwhkrvvwlgsdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaGR6Z292d2hrcnZ2d2xnc2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzMwNTIwOCwiZXhwIjoyMDQ4ODgxMjA4fQ.Kd2oNiho4Kuf3cRs5LRYdkZOdTHs7eL5Hh_Oq-_7LoE'
);

async function checkItemsSchema() {
  try {
    // Get the first row from items to see what columns exist
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching items:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Items table columns:');
      console.log(Object.keys(data[0]));
    } else {
      console.log('No items in table - trying insert to see schema');
      
      // Try to get schema by attempting an insert with minimal data
      const { error: insertError } = await supabase
        .from('items')
        .insert({
          tenant_id: 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c',
          name: 'TEST ITEM',
          type: 'RAW_MATERIAL'
        });
      
      if (insertError) {
        console.error('Insert error (this tells us what columns are expected):');
        console.error(insertError);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkItemsSchema();
