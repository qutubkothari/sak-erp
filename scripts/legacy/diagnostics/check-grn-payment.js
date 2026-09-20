const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ohaodqyuhmhlptgszgpp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oYW9kcXl1aG1obHB0Z3N6Z3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MDQ5MzUsImV4cCI6MjA0ODk4MDkzNX0.h_BfQT4enalbania_key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGRN() {
  const { data, error } = await supabase
    .from('grns')
    .select('grn_number, po_number, gross_amount, debit_note_amount, net_payable_amount, paid_amount, payment_status')
    .ilike('po_number', '%PO-2025-12-023%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('GRN Records for PO-2025-12-023:');
  console.table(data);
  
  if (data && data.length > 0) {
    const grn = data[0];
    console.log('\nDetailed Analysis:');
    console.log('GRN Number:', grn.grn_number);
    console.log('PO Number:', grn.po_number);
    console.log('Gross Amount:', grn.gross_amount);
    console.log('Debit Note Amount:', grn.debit_note_amount);
    console.log('Net Payable:', grn.net_payable_amount);
    console.log('Paid Amount:', grn.paid_amount);
    console.log('Payment Status:', grn.payment_status);
    console.log('\nCalculations:');
    console.log('Balance:', grn.net_payable_amount - (grn.paid_amount || 0));
    console.log('Should be PAID?', (grn.paid_amount || 0) >= grn.net_payable_amount);
  }
}

checkGRN();
