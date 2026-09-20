require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function updateGRNDebitAmount() {
  console.log('=== Updating GRN Debit Note Amount ===\n');
  
  // Get GRN
  const { data: grn } = await supabase
    .from('grns')
    .select('id')
    .eq('grn_number', 'GRN-2026-01-001')
    .single();

  // Get total debit note amount
  const { data: debitNotes } = await supabase
    .from('debit_notes')
    .select('total_amount')
    .eq('grn_id', grn.id);

  const totalDebit = debitNotes.reduce((sum, dn) => sum + parseFloat(dn.total_amount || 0), 0);

  console.log(`Total Debit Note Amount: ₹${totalDebit}`);
  console.log(`Updating GRN...`);

  // Update GRN
  const { data: updated, error } = await supabase
    .from('grns')
    .update({
      debit_note_amount: totalDebit,
      net_payable_amount: 90 - totalDebit,
    })
    .eq('id', grn.id)
    .select()
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n✅ Updated GRN:');
  console.log(`  Gross Amount: ₹${updated.gross_amount}`);
  console.log(`  Debit Note Amount: ₹${updated.debit_note_amount}`);
  console.log(`  Net Payable: ₹${updated.net_payable_amount}`);
}

updateGRNDebitAmount();
