const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wfhdzgovwhkrvvwlgsdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaGR6Z292d2hrcnZ2d2xnc2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzMwNTIwOCwiZXhwIjoyMDQ4ODgxMjA4fQ.Kd2oNiho4Kuf3cRs5LRYdkZOdTHs7eL5Hh_Oq-_7LoE'
);

async function checkBomSchema() {
  try {
    // Try to insert a minimal BOM to see what fields are expected
    const { data, error } = await supabase
      .from('bom_headers')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error selecting from bom_headers:', error);
    } else if (data && data.length > 0) {
      console.log('Existing BOM header columns:');
      console.log(Object.keys(data[0]));
    } else {
      console.log('No BOM headers exist yet');
      
      // Try to insert a test one to see what columns are required
      const testData = {
        tenant_id: 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c',
        product_id: 'test-id',
        version: '1.0',
        valid_from: new Date().toISOString(),
        status: 'ACTIVE'
      };
      
      console.log('Trying to insert test BOM:', testData);
      
      const { data: insertData, error: insertError } = await supabase
        .from('bom_headers')
        .insert(testData)
        .select();
      
      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        console.log('Insert succeeded:', insertData);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkBomSchema();
