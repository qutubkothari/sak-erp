#!/bin/bash
# Check and fix GRN-2026-01-010

cd /var/www/sak-erp

echo "=== Checking GRN-2026-01-010 ===" 

# Upload and run the fix script
cat > /tmp/fix-grn-010.js << 'EOFSCRIPT'
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/api/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function fix() {
  console.log('Fetching GRN-2026-01-010...\n');
  
  const { data: grn, error } = await supabase
    .from('grns')
    .select(\`
      id,
      grn_number,
      tenant_id,
      vendor_id,
      received_by,
      qc_completed,
      grn_items (
        id,
        item_id,
        item_code,
        item_name,
        po_item_id,
        rejected_qty,
        rate,
        unit_price,
        rejection_reason,
        rejection_amount,
        debit_note_id
      )
    \`)
    .eq('grn_number', 'GRN-2026-01-010')
    .single();

  if (error || !grn) {
    console.error('Error:', error);
    return;
  }

  console.log('GRN ID:', grn.id);
  console.log('QC Completed:', grn.qc_completed);
  
  const rejected = (grn.grn_items || []).filter(i => parseFloat(i.rejected_qty || 0) > 0);
  console.log('Rejected Items:', rejected.length, '\n');

  if (rejected.length === 0) {
    console.log('No rejected items found');
    return;
  }

  rejected.forEach((item, i) => {
    console.log(\`\${i + 1}. \${item.item_code} - \${item.item_name}\`);
    console.log(\`   Rejected Qty: \${item.rejected_qty}\`);
    console.log(\`   Rate: \${item.rate || item.unit_price || 'NOT SET'}\`);
    console.log(\`   Debit Note ID: \${item.debit_note_id || 'NOT LINKED'}\n\`);
  });

  // Check existing debit notes
  const { data: existingDN } = await supabase
    .from('debit_notes')
    .select('id, debit_note_number, status, total_amount')
    .eq('grn_id', grn.id);

  if (existingDN && existingDN.length > 0) {
    console.log('Existing Debit Notes:');
    existingDN.forEach(dn => {
      console.log(\`  - \${dn.debit_note_number} (\${dn.status}) - ₹\${dn.total_amount}\`);
    });
    console.log('\nDebit note already exists. No action needed.');
    return;
  }

  console.log('No debit note found. Creating...\n');

  // Calculate and update amounts
  let totalRejection = 0;
  let totalGross = 0;

  for (const item of grn.grn_items || []) {
    const recQty = parseFloat(item.received_qty || 0);
    const rejQty = parseFloat(item.rejected_qty || 0);
    let rate = parseFloat(item.rate || item.unit_price || 0);

    if (rate === 0 && item.po_item_id) {
      const { data: po } = await supabase
        .from('po_items')
        .select('rate, unit_price')
        .eq('id', item.po_item_id)
        .single();
      if (po) rate = parseFloat(po.rate || po.unit_price || 0);
    }

    const lineGross = recQty * rate;
    const rejAmount = rejQty * rate;
    
    totalGross += lineGross;
    totalRejection += rejAmount;

    if (rejQty > 0) {
      await supabase
        .from('grn_items')
        .update({
          rate,
          rejection_amount: rejAmount,
          return_status: 'PENDING_RETURN',
        })
        .eq('id', item.id);
      
      console.log(\`Updated \${item.item_code}: Rejection ₹\${rejAmount.toFixed(2)}\`);
    }
  }

  // Update GRN financials
  await supabase
    .from('grns')
    .update({
      gross_amount: totalGross,
      debit_note_amount: totalRejection,
      net_payable_amount: totalGross - totalRejection,
    })
    .eq('id', grn.id);

  console.log(\`\nGRN updated: Gross ₹\${totalGross.toFixed(2)}, Rejection ₹\${totalRejection.toFixed(2)}\n\`);

  // Create debit note
  const { data: dnNum } = await supabase.rpc('generate_debit_note_number', {
    p_tenant_id: grn.tenant_id,
  });

  const { data: dn, error: dnErr } = await supabase
    .from('debit_notes')
    .insert({
      tenant_id: grn.tenant_id,
      debit_note_number: dnNum || \`DN-\${Date.now()}\`,
      grn_id: grn.id,
      vendor_id: grn.vendor_id,
      total_amount: totalRejection,
      reason: 'QC Rejection - Materials failed quality inspection',
      status: 'DRAFT',
      created_by: grn.received_by,
    })
    .select()
    .single();

  if (dnErr) {
    console.error('DN creation error:', dnErr);
    return;
  }

  console.log(\`Debit Note created: \${dn.debit_note_number}\n\`);

  // Create DN items
  for (const item of rejected) {
    const rate = parseFloat(item.rate || item.unit_price || 0);
    const qty = parseFloat(item.rejected_qty || 0);
    
    await supabase.from('debit_note_items').insert({
      debit_note_id: dn.id,
      grn_item_id: item.id,
      item_id: item.item_id,
      rejected_qty: qty,
      unit_price: rate,
      amount: qty * rate,
      rejection_reason: item.rejection_reason || 'Quality inspection failed',
      return_status: 'PENDING',
    });

    await supabase
      .from('grn_items')
      .update({ debit_note_id: dn.id })
      .eq('id', item.id);

    console.log(\`  Added: \${item.item_code} Qty \${qty} @ ₹\${rate}\`);
  }

  console.log(\`\n✅ Complete! DN \${dn.debit_note_number} with \${rejected.length} items\`);
}

fix().catch(console.error);
EOFSCRIPT

node /tmp/fix-grn-010.js
