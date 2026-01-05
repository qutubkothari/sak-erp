require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkGRN() {
  console.log('=== Checking GRN-2026-01-001 ===\n');
  
  // Get GRN details
  const { data: grn, error: grnError } = await supabase
    .from('grns')
    .select(`
      id,
      grn_number,
      status,
      qc_completed,
      gross_amount,
      debit_note_amount,
      net_payable_amount,
      grn_items(
        id,
        item_id,
        received_qty,
        accepted_qty,
        rejected_qty,
        rejection_reason,
        rejection_amount,
        debit_note_id,
        rate,
        item:items(code, name)
      )
    `)
    .eq('grn_number', 'GRN-2026-01-001')
    .single();

  if (grnError) {
    console.error('Error fetching GRN:', grnError);
    return;
  }

  console.log('GRN Details:');
  console.log('  Number:', grn.grn_number);
  console.log('  Status:', grn.status);
  console.log('  QC Completed:', grn.qc_completed);
  console.log('  Gross Amount:', grn.gross_amount);
  console.log('  Debit Note Amount:', grn.debit_note_amount);
  console.log('  Net Payable:', grn.net_payable_amount);
  console.log('');

  // Check for rejected items
  const rejectedItems = grn.grn_items.filter(item => item.rejected_qty > 0);
  console.log('Rejected Items:', rejectedItems.length);
  
  if (rejectedItems.length > 0) {
    console.log('\nRejected Items Details:');
    rejectedItems.forEach(item => {
      console.log(`  - Item Code: ${item.item?.code || 'N/A'} (${item.item?.name || 'N/A'})`);
      console.log(`    Item ID: ${item.item_id}`);
      console.log(`    Rejected Qty: ${item.rejected_qty}`);
      console.log(`    Rate: ${item.rate}`);
      console.log(`    Rejection Amount: ${item.rejection_amount}`);
      console.log(`    Debit Note ID: ${item.debit_note_id || 'NOT LINKED'}`);
      console.log('');
    });
  }

  // Check all GRN items for financial calculations
  console.log('\n=== All GRN Items (Financial Check) ===');
  grn.grn_items.forEach(item => {
    console.log(`  Item: ${item.item?.code || 'N/A'}`);
    console.log(`    Received Qty: ${item.received_qty}`);
    console.log(`    Rate: ${item.rate}`);
    console.log(`    Line Total: ${(item.received_qty || 0) * (item.rate || 0)}`);
  });

  // Check for debit notes
  const { data: debitNotes, error: dnError } = await supabase
    .from('debit_notes')
    .select('*')
    .eq('grn_id', grn.id);

  if (dnError) {
    console.error('Error fetching debit notes:', dnError);
    return;
  }

  console.log('\n=== Debit Notes ===');
  console.log('Count:', debitNotes.length);
  
  if (debitNotes.length > 0) {
    debitNotes.forEach(dn => {
      console.log(`\n  DN Number: ${dn.debit_note_number}`);
      console.log(`  Status: ${dn.status}`);
      console.log(`  Total Amount: ${dn.total_amount}`);
      console.log(`  Created At: ${dn.created_at}`);
    });
  } else {
    console.log('  ⚠️  NO DEBIT NOTE FOUND!');
    console.log('  This is the issue - debit note should have been auto-created.');
  }

  // Check accounts payable visibility
  console.log('\n=== Accounts Payable Check ===');
  if (grn.status === 'COMPLETED' && grn.net_payable_amount > 0) {
    console.log('  ✅ GRN should appear in Accounts Payable');
    console.log(`  Net Payable: ₹${grn.net_payable_amount}`);
  } else {
    console.log('  ❌ GRN will NOT appear in Accounts Payable');
    console.log(`  Reason: Status=${grn.status}, Net Payable=${grn.net_payable_amount}`);
  }
}

checkGRN().catch(console.error);
