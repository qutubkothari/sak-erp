require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function fixGRN() {
  console.log('=== Fixing GRN-2026-01-001 ===\n');
  
  // Get GRN
  const { data: grn } = await supabase
    .from('grns')
    .select('id, grn_number, vendor_id, tenant_id, received_by')
    .eq('grn_number', 'GRN-2026-01-001')
    .single();

  if (!grn) {
    console.log('GRN not found!');
    return;
  }

  console.log(`Using Tenant ID: ${grn.tenant_id}`);
  console.log(`Using User ID: ${grn.received_by}\n`);

  console.log('Step 1: Fix GRN Items - Calculate rejection_amount and financial fields');
  
  // Get all GRN items
  const { data: items } = await supabase
    .from('grn_items')
    .select('*')
    .eq('grn_id', grn.id);

  console.log(`Found ${items.length} items`);

  let totalGross = 0;
  let totalRejection = 0;

  for (const item of items) {
    const rate = parseFloat(item.rate) || 0;
    const receivedQty = parseFloat(item.received_qty) || 0;
    const rejectedQty = parseFloat(item.rejected_qty) || 0;
    
    const lineTotal = rate * receivedQty;
    const rejectionAmount = rate * rejectedQty;

    totalGross += lineTotal;
    totalRejection += rejectionAmount;

    console.log(`  Item ${item.id}:`);
    console.log(`    Rate: ${rate}, Received: ${receivedQty}, Rejected: ${rejectedQty}`);
    console.log(`    Line Total: ${lineTotal}, Rejection Amount: ${rejectionAmount}`);

    // Update item with calculated amounts
    const updates = {
      rejection_amount: rejectionAmount,
    };

    if (rejectedQty > 0 && !item.debit_note_id) {
      updates.return_status = 'PENDING_RETURN';
    }

    await supabase
      .from('grn_items')
      .update(updates)
      .eq('id', item.id);

    console.log(`    ✅ Updated`);
  }

  console.log(`\nTotal Gross: ₹${totalGross}`);
  console.log(`Total Rejection: ₹${totalRejection}`);
  console.log(`Net Payable: ₹${totalGross - totalRejection}`);

  // Step 2: Update GRN financial fields
  console.log('\nStep 2: Update GRN Financial Amounts');
  
  await supabase
    .from('grns')
    .update({
      gross_amount: totalGross,
      debit_note_amount: totalRejection,
      net_payable_amount: totalGross - totalRejection,
    })
    .eq('id', grn.id);

  console.log('✅ GRN financial amounts updated');

  // Step 3: Create Debit Note if there are rejections
  if (totalRejection > 0) {
    console.log('\nStep 3: Create Debit Note');

    // Check if debit note already exists
    const { data: existingDN } = await supabase
      .from('debit_notes')
      .select('id, debit_note_number')
      .eq('grn_id', grn.id)
      .single();

    if (existingDN) {
      console.log(`⚠️  Debit Note already exists: ${existingDN.debit_note_number}`);
      return;
    }

    // Get DN number
    const { data: dnNumber } = await supabase.rpc('generate_debit_note_number', {
      p_tenant_id: grn.tenant_id,
    });

    console.log(`Generated DN Number: ${dnNumber || 'DN-' + Date.now()}`);

    // Create debit note
    const { data: debitNote, error: dnError } = await supabase
      .from('debit_notes')
      .insert({
        tenant_id: grn.tenant_id,
        debit_note_number: dnNumber || `DN-${Date.now()}`,
        grn_id: grn.id,
        vendor_id: grn.vendor_id,
        total_amount: totalRejection,
        reason: 'QC Rejection - Materials failed quality inspection',
        status: 'DRAFT',
        created_by: grn.received_by,
      })
      .select()
      .single();

    if (dnError) {
      console.error('❌ Failed to create debit note:', dnError);
      return;
    }

    console.log(`✅ Debit Note created: ${debitNote.debit_note_number}`);

    // Create debit note items
    const rejectedItems = items.filter(i => parseFloat(i.rejected_qty) > 0);

    for (const item of rejectedItems) {
      const rate = parseFloat(item.rate) || 0;
      const rejectedQty = parseFloat(item.rejected_qty) || 0;
      const amount = rate * rejectedQty;

      await supabase
        .from('debit_note_items')
        .insert({
          debit_note_id: debitNote.id,
          grn_item_id: item.id,
          item_id: item.item_id,
          rejected_qty: rejectedQty,
          unit_price: rate,
          amount: amount,
          rejection_reason: item.rejection_reason || 'Quality inspection failed',
          return_status: 'PENDING',
        });

      // Link debit note to grn_item
      await supabase
        .from('grn_items')
        .update({ debit_note_id: debitNote.id })
        .eq('id', item.id);

      console.log(`  ✅ Added DN item for rejected qty ${rejectedQty}`);
    }

    console.log(`\n✅ Debit Note ${debitNote.debit_note_number} created with ${rejectedItems.length} items`);
  }

  console.log('\n=== FIX COMPLETE ===');
  console.log('\nNext Steps:');
  console.log('1. Refresh the GRN page - financial summary should now show');
  console.log('2. Check Purchase → Debit Notes - new DN should appear');
  console.log('3. Check Accounts → Payables - GRN should now be visible');
}

fixGRN().catch(console.error);
