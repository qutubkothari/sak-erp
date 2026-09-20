const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://hnbibtvxxuhhtfjcipsy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYmlidHZ4eHVoaHRmamNpcHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4MTcxNzcsImV4cCI6MjA0OTM5MzE3N30.Gqu1lTNOJGDvNq-u7iTJrVkUqh-SqjWoGzrCF0PaLRY');

async function check() {
  const { data } = await supabase
    .from('grn_items')
    .select('id, item_id, rejected_qty, rate, rejection_amount')
    .eq('grn_id', 'e3b08ff3-2ed1-484c-a66e-f086a8528292')
    .gt('rejected_qty', 0);
  
  console.log('GRN item with rejection:');
  console.log(JSON.stringify(data, null, 2));
}

check();
