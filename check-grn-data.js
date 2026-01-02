const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qxgtrzftfucdokwxcwxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4Z3RyemZ0ZnVjZG9rd3hjd3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1OTI4NDAsImV4cCI6MjA0ODE2ODg0MH0.z4Y-FxM0VqLXzHfz7hLqWGIXB6_d8OQu7-OEXO04xps'
);

async function checkGRN() {
  // Get GRN items for GRN-2025-11-007
  const { data: items, error } = await supabase
    .from('grn_items')
    .select('item_code, ordered_qty, received_qty, accepted_qty')
    .eq('grn_id', (await supabase.from('grn').select('id').eq('grn_number', 'GRN-2025-11-007').single()).data.id);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('GRN Items for GRN-2025-11-007:');
  console.table(items);
}

checkGRN();
