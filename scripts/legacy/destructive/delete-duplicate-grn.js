require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function deleteDuplicateGRN() {
  const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
  const userId = '243908d0-899c-4d5a-bb77-8e8bf0197746'; // SAK Admin user
  const grnNumber = 'GRN-2026-02-002';

  console.log(`\n=== Deleting Duplicate GRN: ${grnNumber} ===\n`);

  // Find the GRN
  const { data: grn, error: grnError } = await supabase
    .from('grns')
    .select('id, grn_number, grn_items(id)')
    .eq('tenant_id', tenantId)
    .eq('grn_number', grnNumber)
    .single();

  if (grnError || !grn) {
    console.error('❌ GRN not found:', grnError);
    return;
  }

  console.log(`Found GRN: ${grn.id}`);
  console.log(`Items count: ${grn.grn_items?.length || 0}`);

  // Set user context for activity log
  await supabase.rpc('set_current_user_id', { p_user_id: userId });

  // Delete GRN items first
  if (grn.grn_items && grn.grn_items.length > 0) {
    console.log('\nDeleting GRN items...');
    const { error: itemsError } = await supabase
      .from('grn_items')
      .delete()
      .eq('grn_id', grn.id);

    if (itemsError) {
      console.error('❌ Failed to delete GRN items:', itemsError);
      return;
    }
    console.log('✅ GRN items deleted');
  }

  // Soft delete the GRN (mark as deleted)
  console.log('\nSoft deleting GRN...');
  const { error: deleteError } = await supabase
    .from('grns')
    .update({ 
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    })
    .eq('id', grn.id);

  if (deleteError) {
    console.error('❌ Failed to delete GRN:', deleteError);
    return;
  }

  console.log(`✅ ${grnNumber} marked as deleted successfully\n`);
}

deleteDuplicateGRN()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
