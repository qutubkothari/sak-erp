const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nwkaruzvzwwuftjquypk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

console.log('============================================================================');
console.log('DELETE ALL ITEMS, VENDORS, AND BOMS');
console.log('============================================================================');
console.log('');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

async function deleteFromTable(tableName) {
  try {
    // First get count
    const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
    
    if (count === 0) {
      console.log(`  ${tableName}: 0 records (skipping)`);
      return { success: true, count: 0 };
    }

    console.log(`  ${tableName}: deleting ${count} records...`);
    
    // Delete all records
    const { error } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) {
      console.log(`  ${tableName}: ❌ ERROR - ${error.message}`);
      return { success: false, error: error.message };
    }
    
    console.log(`  ${tableName}: ✅ deleted ${count} records`);
    return { success: true, count };
  } catch (err) {
    console.log(`  ${tableName}: ❌ ERROR - ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('⚠️  WARNING: This will delete ALL items, vendors, and BOMs!');
  console.log('');
  
  console.log('Deleting related data in correct order...');
  console.log('');

  // Delete in the correct order to handle foreign keys
  const deletionOrder = [
    // Warranty data
    'warranties',
    
    // Deployment history
    'product_deployment_history',
    
    // Production/Job order data
    'job_order_materials',
    'production_job_orders',
    
    // Dispatch/Sales data
    'dispatch_items',
    'dispatch_notes',
    'sales_order_items',
    'sales_orders',
    'quotation_items',
    'quotations',
    
    // BOM data
    'bom_items',
    'bom_headers',
    
    // Item-Vendor relationships
    'item_vendors',
    
    // Debit notes (referencing grns)
    'debit_note_items',
    'debit_notes',
    
    // Purchase data
    'grn_items',
    'grns',
    'purchase_order_items',
    'purchase_orders',
    'purchase_requisition_items',
    'purchase_requisitions',
    
    // Production
    'production_orders',
    
    // Inventory
    'stock_entries',
    
    // UID tracking
    'uid_registry',
    
    // RFQ data
    'rfq_items',
    'pr_item_rfq_vendors',
    'rfqs',
    
    // Item drawings
    'item_drawings',
    
    // Finally delete master data
    'items',
    'vendors'
  ];

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (const tableName of deletionOrder) {
    const result = await deleteFromTable(tableName);
    
    if (result.success) {
      if (result.count > 0) {
        results.success.push({ table: tableName, count: result.count });
      } else {
        results.skipped.push(tableName);
      }
    } else {
      results.failed.push({ table: tableName, error: result.error });
    }
  }

  console.log('');
  console.log('============================================================================');
  console.log('DELETION SUMMARY');
  console.log('============================================================================');
  console.log('');
  console.log(`✅ Successfully deleted from ${results.success.length} tables`);
  if (results.success.length > 0) {
    results.success.forEach(r => {
      console.log(`   - ${r.table}: ${r.count} records`);
    });
  }
  
  if (results.skipped.length > 0) {
    console.log('');
    console.log(`⚪ Skipped ${results.skipped.length} empty tables`);
  }
  
  if (results.failed.length > 0) {
    console.log('');
    console.log(`❌ Failed for ${results.failed.length} tables:`);
    results.failed.forEach(r => {
      console.log(`   - ${r.table}: ${r.error}`);
    });
    console.log('');
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ Deletion completed successfully!');
  console.log('   You can now reimport items, vendors, and BOMs.');
  console.log('');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
