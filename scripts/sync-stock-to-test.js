/**
 * Sync Stock Data from Live to PMSTEST
 * For Production Module trials by Abdul
 * 
 * Tables synced:
 * - plants, warehouses, companies (master)
 * - items (master)
 * - stock_entries (stock transactions)
 * - uid_registry (UID tracking)
 * - bom_headers, bom_items (BOMs)
 * - production_orders, production_stages (production data)
 */

const { createClient } = require('@supabase/supabase-js');

// Live database
const LIVE_URL = process.env.LIVE_SUPABASE_URL || 'https://your-live-project.supabase.co';
const LIVE_KEY = process.env.LIVE_SUPABASE_SERVICE_KEY;

// Test database  
const TEST_URL = process.env.TEST_SUPABASE_URL || 'https://your-test-project.supabase.co';
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_KEY;

async function syncTable(source, target, tableName, select = '*', batchSize = 100) {
  console.log(`\n[${tableName}] Starting sync...`);
  
  // Fetch from live
  const { data, error } = await source
    .from(tableName)
    .select(select);
    
  if (error) {
    console.error(`[${tableName}] Fetch error:`, error.message);
    return { table: tableName, error: error.message, count: 0 };
  }
  
  const records = data || [];
  console.log(`[${tableName}] Fetched ${records.length} records from live`);
  
  if (records.length === 0) {
    return { table: tableName, count: 0 };
  }
  
  // Clear test table
  const { error: deleteError } = await target
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
  if (deleteError && !deleteError.message.includes('timeout')) {
    console.warn(`[${tableName}] Delete warning:`, deleteError.message);
  }
  
  // Insert in batches
  let inserted = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error: insertError } = await target
      .from(tableName)
      .upsert(batch, { onConflict: 'id' });
      
    if (insertError) {
      console.error(`[${tableName}] Batch ${i}-${i+batch.length} error:`, insertError.message);
    } else {
      inserted += batch.length;
    }
  }
  
  console.log(`[${tableName}] Synced ${inserted}/${records.length} records`);
  return { table: tableName, count: inserted, total: records.length };
}

async function syncStockData() {
  console.log('=== STOCK DATA SYNC: LIVE → PMSTEST ===');
  console.log('Started at:', new Date().toISOString());
  
  if (!LIVE_KEY || !TEST_KEY) {
    console.error('Error: SUPABASE_SERVICE_KEY not set for both environments');
    console.log('Set LIVE_SUPABASE_URL, LIVE_SUPABASE_SERVICE_KEY');
    console.log('Set TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  
  const live = createClient(LIVE_URL, LIVE_KEY);
  const test = createClient(TEST_URL, TEST_KEY);
  
  const results = [];
  
  // 1. Master Data (required for foreign keys)
  results.push(await syncTable(live, test, 'companies'));
  results.push(await syncTable(live, test, 'plants'));
  results.push(await syncTable(live, test, 'warehouses'));
  results.push(await syncTable(live, test, 'vendors'));
  results.push(await syncTable(live, test, 'customers'));
  results.push(await syncTable(live, test, 'suppliers'));
  
  // 2. Items (master data for stock)
  results.push(await syncTable(live, test, 'items'));
  
  // 3. Stock Data
  results.push(await syncTable(live, test, 'stock_entries'));
  results.push(await syncTable(live, test, 'uid_registry'));
  
  // 4. BOM Data (for Production Module)
  results.push(await syncTable(live, test, 'bom_headers'));
  results.push(await syncTable(live, test, 'bom_items'));
  
  // 5. Production Data (optional - for complete picture)
  results.push(await syncTable(live, test, 'production_orders'));
  results.push(await syncTable(live, test, 'production_stages'));
  
  // Summary
  console.log('\n=== SYNC SUMMARY ===');
  results.forEach(r => {
    if (r.error) {
      console.log(`❌ ${r.table}: ${r.error}`);
    } else {
      console.log(`✅ ${r.table}: ${r.count}/${r.total || r.count} records`);
    }
  });
  
  const errors = results.filter(r => r.error);
  const success = results.filter(r => !r.error);
  
  console.log(`\nTotal: ${success.length} tables synced, ${errors.length} errors`);
  console.log('Completed at:', new Date().toISOString());
  
  return { success: success.length, errors: errors.length, results };
}

syncStockData()
  .then(result => {
    console.log('\nDone!');
    process.exit(result.errors > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
