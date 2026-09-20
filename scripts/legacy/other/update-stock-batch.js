/**
 * Batch update stock to 500 for all RAW_MATERIAL items using SQL
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateStockBatch() {
  console.log('\n============================================================');
  console.log('BATCH UPDATING RAW MATERIAL STOCK TO 500');
  console.log('============================================================\n');

  try {
    // Get warehouse
    const { data: warehouse, error: whError } = await supabase
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

    console.log(`✅ Using warehouse: ${warehouse.name}\n`);

    // Use RPC to execute batch SQL
    const sql = `
      -- Step 1: Delete existing inventory_stock for RAW_MATERIAL items
      DELETE FROM inventory_stock
      WHERE tenant_id = '${tenantId}'
        AND item_id IN (SELECT id FROM items WHERE tenant_id = '${tenantId}' AND type = 'RAW_MATERIAL');

      -- Step 2: Insert new inventory_stock records
      INSERT INTO inventory_stock (
        tenant_id, item_id, warehouse_id, location_id, category,
        quantity, reserved_quantity, min_quantity, reorder_point,
        last_movement_date, created_at, updated_at
      )
      SELECT
        '${tenantId}'::uuid,
        i.id,
        '${warehouse.id}'::uuid,
        NULL,
        'RAW_MATERIAL'::inventory_category,
        500,
        0,
        0,
        10,
        NOW(),
        NOW(),
        NOW()
      FROM items i
      WHERE i.tenant_id = '${tenantId}' AND i.type = 'RAW_MATERIAL';

      -- Step 3: Delete existing stock_entries for RAW_MATERIAL items
      DELETE FROM stock_entries
      WHERE tenant_id = '${tenantId}'
        AND item_id IN (SELECT id FROM items WHERE tenant_id = '${tenantId}' AND type = 'RAW_MATERIAL');

      -- Step 4: Insert new stock_entries records
      INSERT INTO stock_entries (
        tenant_id, item_id, warehouse_id, quantity, available_quantity,
        allocated_quantity, batch_number, metadata, created_at, updated_at
      )
      SELECT
        '${tenantId}'::uuid,
        i.id,
        '${warehouse.id}'::uuid,
        500,
        500,
        0,
        'INITIAL-STOCK',
        '{}'::jsonb,
        NOW(),
        NOW()
      FROM items i
      WHERE i.tenant_id = '${tenantId}' AND i.type = 'RAW_MATERIAL';

      -- Return counts
      SELECT 
        (SELECT COUNT(*) FROM inventory_stock WHERE tenant_id = '${tenantId}') as inventory_count,
        (SELECT COUNT(*) FROM stock_entries WHERE tenant_id = '${tenantId}') as stock_entries_count,
        (SELECT COUNT(*) FROM items WHERE tenant_id = '${tenantId}' AND type = 'RAW_MATERIAL') as raw_material_count,
        (SELECT COUNT(*) FROM items WHERE tenant_id = '${tenantId}' AND type = 'SUB_ASSEMBLY') as sub_assembly_count;
    `;

    console.log('Executing batch update...\n');

    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      console.error('❌ SQL Error:', error.message);
      console.error('Trying individual updates instead...\n');

      // Fallback: Get all raw material item IDs
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('type', 'RAW_MATERIAL');

      if (itemsError) {
        console.error('❌ Failed to fetch items:', itemsError.message);
        process.exit(1);
      }

      console.log(`Found ${items.length} RAW_MATERIAL items`);

      // Delete old inventory_stock records
      console.log('Deleting old inventory_stock records...');
      const { error: delInvError } = await supabase
        .from('inventory_stock')
        .delete()
        .eq('tenant_id', tenantId)
        .in('item_id', items.map(i => i.id));

      if (delInvError) {
        console.error('⚠️  Warning deleting inventory_stock:', delInvError.message);
      }

      // Delete old stock_entries records
      console.log('Deleting old stock_entries records...');
      const { error: delStockError } = await supabase
        .from('stock_entries')
        .delete()
        .eq('tenant_id', tenantId)
        .in('item_id', items.map(i => i.id));

      if (delStockError) {
        console.error('⚠️  Warning deleting stock_entries:', delStockError.message);
      }

      // Batch insert inventory_stock (250 at a time)
      console.log('\nInserting new inventory_stock records...');
      const batchSize = 250;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const inventoryRecords = batch.map(item => ({
          tenant_id: tenantId,
          item_id: item.id,
          warehouse_id: warehouse.id,
          location_id: null,
          category: 'RAW_MATERIAL',
          quantity: 500,
          reserved_quantity: 0,
          min_quantity: 0,
          reorder_point: 10,
          last_movement_date: new Date().toISOString()
        }));

        const { error: invError } = await supabase
          .from('inventory_stock')
          .insert(inventoryRecords);

        if (invError) {
          console.error(`❌ Error inserting inventory_stock batch ${i / batchSize + 1}:`, invError.message);
        } else {
          console.log(`   ✅ Inserted batch ${i / batchSize + 1}/${Math.ceil(items.length / batchSize)}`);
        }
      }

      // Batch insert stock_entries (250 at a time)
      console.log('\nInserting new stock_entries records...');
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const stockRecords = batch.map(item => ({
          tenant_id: tenantId,
          item_id: item.id,
          warehouse_id: warehouse.id,
          quantity: 500,
          available_quantity: 500,
          allocated_quantity: 0,
          batch_number: 'INITIAL-STOCK',
          metadata: {}
        }));

        const { error: stockError } = await supabase
          .from('stock_entries')
          .insert(stockRecords);

        if (stockError) {
          console.error(`❌ Error inserting stock_entries batch ${i / batchSize + 1}:`, stockError.message);
        } else {
          console.log(`   ✅ Inserted batch ${i / batchSize + 1}/${Math.ceil(items.length / batchSize)}`);
        }
      }
    }

    // Final verification
    const { count: invCount } = await supabase
      .from('inventory_stock')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('category', 'RAW_MATERIAL');

    const { count: stockCount } = await supabase
      .from('stock_entries')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: rawCount } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'RAW_MATERIAL');

    const { count: subCount } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'SUB_ASSEMBLY');

    console.log('\n============================================================');
    console.log('UPDATE COMPLETE');
    console.log('============================================================');
    console.log(`✅ inventory_stock records: ${invCount}`);
    console.log(`✅ stock_entries records: ${stockCount}`);
    console.log(`📦 RAW_MATERIAL items: ${rawCount} (all set to 500 units)`);
    console.log(`⚠️  SUB_ASSEMBLY items: ${subCount} (NOT updated - check auto-creation)`);
    console.log('============================================================\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

updateStockBatch();
