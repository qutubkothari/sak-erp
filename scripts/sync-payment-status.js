// Standalone script to sync GRN payment status based on PO advances
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/\/\/.*@/, '//')?.split('/')[0];
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

async function syncPaymentStatus() {
  const supabase = createClient(
    SUPABASE_URL?.replace('postgresql://', 'https://')?.split('?')[0] || 'https://your-project.supabase.co',
    SUPABASE_KEY
  );

  console.log('Fetching GRNs with PO associations...');
  
  // Get all GRNs with their PO IDs
  const { data: grns, error: grnError } = await supabase
    .from('grns')
    .select('id, po_id, tenant_id, net_payable_amount, paid_amount, tds_amount, short_payment_amount, payment_status, grn_number')
    .not('po_id', 'is', null);

  if (grnError) {
    console.error('Error fetching GRNs:', grnError);
    process.exit(1);
  }

  console.log(`Found ${grns?.length || 0} GRNs with PO associations`);

  let updated = 0;
  const updates = [];

  for (const grn of grns || []) {
    if (!grn.po_id) continue;

    // Get total advance for this PO
    const { data: advances } = await supabase
      .from('po_advance_payments')
      .select('amount')
      .eq('po_id', grn.po_id)
      .eq('tenant_id', grn.tenant_id);

    const poAdvance = (advances || []).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

    const netPayable = parseFloat(grn.net_payable_amount || 0);
    const paid = parseFloat(grn.paid_amount || 0);
    const tds = parseFloat(grn.tds_amount || 0);
    const short = parseFloat(grn.short_payment_amount || 0);

    // Total settlement including advance
    const totalSettled = paid + tds + short + poAdvance;
    const outstanding = Math.max(0, netPayable - totalSettled);

    // Check if should be marked as PAID
    if (totalSettled >= netPayable - 0.01 && grn.payment_status !== 'PAID') {
      updates.push({
        id: grn.id,
        tenant_id: grn.tenant_id,
        grn_number: grn.grn_number,
        payment_status: 'PAID',
        netPayable,
        totalSettled,
        outstanding
      });
    }
  }

  console.log(`\nFound ${updates.length} GRNs to update to PAID:`);
  updates.forEach(u => {
    console.log(`  - ${u.grn_number}: ₹${u.netPayable} → PAID (advance covers full amount)`);
  });

  // Batch update
  for (const update of updates) {
    const { error } = await supabase
      .from('grns')
      .update({ 
        payment_status: update.payment_status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', update.id)
      .eq('tenant_id', update.tenant_id);

    if (error) {
      console.error(`Error updating ${update.grn_number}:`, error);
    } else {
      updated++;
    }
  }

  console.log(`\n✅ Successfully updated ${updated} GRNs to PAID status`);
  return { updated };
}

syncPaymentStatus()
  .then(result => {
    console.log('\nDone:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
