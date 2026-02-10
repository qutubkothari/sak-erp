/**
 * Set stock to 500 for all RAW_MATERIAL items
 * (Excludes SUB_ASSEMBLY items to test if they auto-create)
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateStock() {
  console.log('\n============================================================');
  console.log('UPDATING RAW MATERIAL STOCK TO 500');
  console.log('============================================================\n');
  
  try {
    // Get warehouse
    const { data: warehouses, error: whError } = await supabase
      .from('warehouses')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (whError) {
      console.error('❌ Error fetching warehouse:', whError.message);
      process.exit(1);
    }

    console.log(`✅ Using warehouse: ${warehouses.name} (${warehouses.id})\n`);

    // Get count of RAW_MATERIAL items
    const { count: rawMaterialCount, error: countError } = await supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'RAW_MATERIAL');

    if (countError) {
      console.error('❌ Error counting items:', countError.message);
      process.exit(1);
    }

    console.log(`Found ${rawMaterialCount} RAW_MATERIAL items\n`);

    // Get all raw material items
    const { data: rawMaterials, error: itemsError } = await supabase
      .from('items')
      .select('id, code, name')
      .eq('tenant_id', tenantId)
      .eq('type', 'RAW_MATERIAL');

    if (itemsError) {
      console.error('❌ Error fetching items:', itemsError.message);
      process.exit(1);
    }

    console.log('Updating inventory...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const item of rawMaterials) {
      // Delete existing inventory_stock
      await supabase
        .from('inventory_stock')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('item_id', item.id);

      // Insert new inventory_stock with quantity = 500
      const { error: invError } = await supabase
        .from('inventory_stock')
        .insert({
          tenant_id: tenantId,
          item_id: item.id,
          warehouse_id: warehouses.id,
          location_id: null,
          category: 'RAW_MATERIAL',
          quantity: 500,
          reserved_quantity: 0,
          min_quantity: 0,
          reorder_point: 10,
          last_movement_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (invError) {
        console.log(`❌ ${item.code}: Failed to update inventory_stock - ${invError.message}`);
        errorCount++;
        continue;
      }

      // Delete existing stock_entries
      await supabase
        .from('stock_entries')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('item_id', item.id);

      // Insert new stock_entries with quantity = 500
      const { error: stockError } = await supabase
        .from('stock_entries')
        .insert({
          tenant_id: tenantId,
          item_id: item.id,
          warehouse_id: warehouses.id,
          quantity: 500,
          available_quantity: 500,
          allocated_quantity: 0,
          batch_number: 'INITIAL-STOCK',
          metadata: { source: 'initial_stock_setup' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (stockError) {
        console.log(`❌ ${item.code}: Failed to update stock_entries - ${stockError.message}`);
        errorCount++;
        continue;
      }

      successCount++;
      if (successCount % 50 === 0) {
        console.log(`   Processed ${successCount}/${rawMaterialCount} items...`);
      }
    }

    console.log('\n============================================================');
    console.log('STOCK UPDATE SUMMARY');
    console.log('============================================================');
    console.log(`✅ Success: ${successCount} items updated to 500 units`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} items failed`);
    }

    // Check sub-assembly count
    const { count: subAssemblyCount } = await supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'SUB_ASSEMBLY');

    console.log(`\n⚠️  ${subAssemblyCount} SUB_ASSEMBLY items NOT updated`);
    console.log('   → Check if they auto-create when needed!\n');

    // Verification query
    const { data: stockStats, error: statsError } = await supabase
      .from('inventory_stock')
      .select('quantity')
      .eq('tenant_id', tenantId)
      .eq('category', 'RAW_MATERIAL');

    if (!statsError && stockStats) {
      const totalQty = stockStats.reduce((sum, s) => sum + parseFloat(s.quantity), 0);
      console.log(`📊 Total RAW_MATERIAL stock: ${totalQty.toLocaleString()} units`);
      console.log(`📦 Average per item: ${(totalQty / stockStats.length).toFixed(2)} units`);
    }

    console.log('============================================================\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

updateStock();
