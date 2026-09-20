// Run this on server: node fix-grn-2026-01-010.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/api/.env' });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set in ./apps/api/.env');
  console.log('Current directory:', process.cwd());
  console.log('Looking for .env at:', require('path').resolve('./apps/api/.env'));
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function fixGRN() {
  console.log('=== Checking GRN-2026-01-010 ===\n');

  // Get GRN with all items
  const { data: grn, error: grnError } = await supabase
    .from('grns')
    .select(`
      id,
      grn_number,
      tenant_id,
      vendor_id,
      received_by,
      qc_completed,
      gross_amount,
      debit_note_amount,
      net_payable_amount,
      grn_items (
        id,
        item_id,
        item_code,
        item_name,
        po_item_id,
        received_qty,
        accepted_qty,
        rejected_qty,
        rate,
        rejection_reason,
        rejection_amount,
        debit_note_id,
        return_status,
        item:items(code, name)
      )
    `)
    .eq('grn_number', 'GRN-2026-01-010')
    .single();

  if (grnError || !grn) {
    console.error('Error fetching GRN:', grnError);
    return;
  }

  console.log('GRN Found:');
  console.log('  ID:', grn.id);
  console.log('  Number:', grn.grn_number);
  console.log('  QC Completed:', grn.qc_completed);
  console.log('  Gross Amount:', grn.gross_amount);
  console.log('  Debit Note Amount:', grn.debit_note_amount);
  console.log('  Net Payable:', grn.net_payable_amount);
  console.log('');

  // Check for rejected items
  const items = grn.grn_items || [];
  const rejectedItems = items.filter(i => parseFloat(i.rejected_qty || 0) > 0);
  
  console.log(`Total Items: ${items.length}`);
  console.log(`Rejected Items: ${rejectedItems.length}\n`);

  if (rejectedItems.length === 0) {
    console.log('❌ No rejected items found in this GRN');
    return;
  }

  console.log('Rejected Items Details:');
  rejectedItems.forEach((item, idx) => {
    console.log(`\n  ${idx + 1}. ${item.item?.code || item.item_code} - ${item.item?.name || item.item_name}`);
    console.log(`     Rejected Qty: ${item.rejected_qty}`);
    console.log(`     Rate: ${item.rate || 'NOT SET'}`);
    console.log(`     Rejection Amount: ${item.rejection_amount || 'NOT SET'}`);
    console.log(`     Rejection Reason: ${item.rejection_reason || 'NOT SET'}`);
    console.log(`     Debit Note ID: ${item.debit_note_id || 'NOT LINKED'}`);
    console.log(`     Return Status: ${item.return_status || 'NONE'}`);
  });

  // Check if debit note already exists for this GRN
  const { data: existingDN } = await supabase
    .from('debit_notes')
    .select('id, debit_note_number, status, total_amount')
    .eq('grn_id', grn.id);

  console.log('\n\nExisting Debit Notes for this GRN:');
  if (!existingDN || existingDN.length === 0) {
    console.log('  ❌ NO DEBIT NOTES FOUND');
    console.log('\n=== CREATING MISSING DEBIT NOTE ===\n');
    
    // Calculate totals
    let totalGross = 0;
    let totalRejection = 0;

    // Update each item with proper amounts
    for (const item of items) {
      const receivedQty = parseFloat(item.received_qty || 0);
      const rejectedQty = parseFloat(item.rejected_qty || 0);
      const acceptedQty = parseFloat(item.accepted_qty || receivedQty - rejectedQty);
      
      // Get rate
      let rate = parseFloat(item.rate || 0);
      
      // If rate is missing, try to get from PO
      if (rate === 0 && item.po_item_id) {
        const { data: poItem } = await supabase
          .from('po_items')
          .select('rate')
          .eq('id', item.po_item_id)
          .single();
        
        if (poItem) {
          rate = parseFloat(poItem.rate || 0);
          console.log(`  ℹ️  Using PO rate ${rate} for item ${item.item_code}`);
        }
      }

      const lineGross = receivedQty * rate;
      const rejectionAmount = rejectedQty * rate;

      totalGross += lineGross;
      totalRejection += rejectionAmount;

      // Update GRN item
      const updates = {
        rate,
        rejection_amount: rejectionAmount,
        return_status: rejectedQty > 0 ? 'PENDING_RETURN' : 'NONE',
      };

      await supabase
        .from('grn_items')
        .update(updates)
        .eq('id', item.id);

      if (rejectedQty > 0) {
        console.log(`  ✅ Updated item ${item.item_code}: Rejection ₹${rejectionAmount.toFixed(2)}`);
      }
    }

    console.log(`\nTotal Gross: ₹${totalGross.toFixed(2)}`);
    console.log(`Total Rejection: ₹${totalRejection.toFixed(2)}`);
    console.log(`Net Payable: ₹${(totalGross - totalRejection).toFixed(2)}`);

    // Update GRN financial fields
    console.log('\nUpdating GRN Financial Amounts...');
    await supabase
      .from('grns')
      .update({
        gross_amount: totalGross,
        debit_note_amount: totalRejection,
        net_payable_amount: totalGross - totalRejection,
      })
      .eq('id', grn.id);

    console.log('✅ GRN financial amounts updated');

    // Create Debit Note
    if (totalRejection > 0) {
      console.log('\nCreating Debit Note...');

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

      // Create debit note items for each rejected item
      for (const item of rejectedItems) {
        const rate = parseFloat(item.rate || item.unit_price || 0);
        const rejectedQty = parseFloat(item.rejected_qty || 0);
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

        console.log(`  ✅ Added DN item: ${item.item_code} - Qty ${rejectedQty} @ ₹${rate} = ₹${amount.toFixed(2)}`);
      }

      console.log(`\n✅ Debit Note ${debitNote.debit_note_number} created with ${rejectedItems.length} items`);
      console.log(`   Total Amount: ₹${totalRejection.toFixed(2)}`);
    }

  } else {
    console.log(`  ✅ Found ${existingDN.length} debit note(s):`);
    existingDN.forEach(dn => {
      console.log(`     - ${dn.debit_note_number} (${dn.status}) - ₹${dn.total_amount}`);
    });
  }

  console.log('\n=== COMPLETE ===');
  console.log('\nNext Steps:');
  console.log('1. Refresh the GRN page');
  console.log('2. Check Purchase → Debit Notes');
  console.log('3. Verify the debit note appears and links to this GRN');
}

fixGRN().catch(console.error);
