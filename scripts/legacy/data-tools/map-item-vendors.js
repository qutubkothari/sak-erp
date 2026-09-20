require('dotenv').config({ path: './deploy-temp/.env' });
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function mapItemVendors() {
  console.log('============================================================');
  console.log('MAPPING ITEMS TO PREFERRED VENDORS');
  console.log('============================================================\n');

  // Load vendors
  const { data: vendors, error: vendorError } = await supabase
    .from('vendors')
    .select('*')
    .eq('tenant_id', tenantId);

  if (vendorError) {
    console.error('Error loading vendors:', vendorError);
    return;
  }

  const vendorMap = new Map();
  vendors.forEach(v => vendorMap.set(v.code.toUpperCase(), v));
  console.log(`Loaded ${vendors.length} vendors\n`);

  // Load items
  const { data: items, error: itemError } = await supabase
    .from('items')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('type', 'RAW_MATERIAL'); // Only map raw materials, not sub-assemblies

  if (itemError) {
    console.error('Error loading items:', itemError);
    return;
  }

  console.log(`Found ${items.length} raw material items\n`);

  // Read Excel file
  const workbook = xlsx.readFile('BOM-LIST.xlsx');
  const rmSheet = workbook.Sheets['RM'];
  const rmData = xlsx.utils.sheet_to_json(rmSheet, { header: 1 });

  // Build item-to-vendor mapping from Excel
  const headers = rmData[1]; // Row 2 (index 1) has headers
  const supplierColIndex = headers.findIndex(h => 
    String(h).toUpperCase().includes('SUPPLIER') || 
    String(h).toUpperCase().includes('VENDOR')
  );
  const partNumberColIndex = headers.findIndex(h => 
    String(h).toUpperCase().includes('SAS PART') || 
    String(h).toUpperCase().includes('PART NUMBER')
  );
  const nameColIndex = headers.findIndex(h => 
    String(h).toUpperCase().includes('RAW MATERIAL NAME') ||
    String(h).toUpperCase().includes('ITEM NAME')
  );

  console.log(`Excel columns: Supplier=${supplierColIndex}, PartNumber=${partNumberColIndex}, Name=${nameColIndex}\n`);

  const stats = {
    processed: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    noVendor: 0,
    vendorsCreated: 0
  };

  // Helper to create vendor code
  function createVendorCode(name, existingCodes = new Set()) {
    const base = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);
    
    let code = base;
    let counter = 1;
    
    while (existingCodes.has(code)) {
      const suffix = String(counter).padStart(2, '0');
      code = base.substring(0, 4) + suffix;
      counter++;
    }
    
    return code;
  }

  // Get existing vendor codes
  const existingVendorCodes = new Set(vendors.map(v => v.code));

  // Process each row from Excel
  for (let i = 2; i < rmData.length; i++) { // Start from row 3 (index 2)
    const row = rmData[i];
    if (!row || row.length === 0) continue;

    const partNumber = String(row[partNumberColIndex] || '').trim();
    const itemName = String(row[nameColIndex] || '').trim();
    const supplierCode = String(row[supplierColIndex] || '').trim();

    if (!itemName) continue;

    // Generate item code the same way as import script
    const itemCode = (partNumber || itemName)
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
      .substring(0, 50);
    
    // Skip if no supplier or IN HOUSE
    if (!supplierCode || supplierCode.toUpperCase() === 'IN HOUSE') {
      continue;
    }
    
    // Find the item in database
    const item = items.find(i => i.code === itemCode);
    if (!item) {
      // Don't log missing items - they might be sub-assemblies
      continue;
    }

    stats.processed++;

    // Find or create vendor
    let vendor = vendorMap.get(supplierCode.toUpperCase());
    if (!vendor) {
      // Create new vendor
      const newVendorCode = createVendorCode(supplierCode, existingVendorCodes);
      const { data: newVendor, error: vendorError } = await supabase
        .from('vendors')
        .insert({
          tenant_id: tenantId,
          code: newVendorCode,
          name: supplierCode,
          legal_name: supplierCode,
          is_active: true
        })
        .select()
        .single();

      if (vendorError) {
        console.log(`❌ Failed to create vendor ${supplierCode}: ${vendorError.message}`);
        stats.noVendor++;
        continue;
      }

      vendor = newVendor;
      vendorMap.set(supplierCode.toUpperCase(), vendor);
      existingVendorCodes.add(newVendorCode);
      console.log(`➕ Created vendor: ${supplierCode} (${newVendorCode})`);
      stats.vendorsCreated++;
    }

    // Check if mapping already exists
    const { data: existing } = await supabase
      .from('item_vendors')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('item_id', item.id)
      .eq('vendor_id', vendor.id)
      .maybeSingle();

    if (existing) {
      stats.skipped++;
      continue;
    }

    // Create mapping
    const { error } = await supabase
      .from('item_vendors')
      .insert({
        tenant_id: tenantId,
        item_id: item.id,
        vendor_id: vendor.id,
        priority: 1,
        unit_price: null,
        is_active: true,
        lead_time_days: null,
        minimum_order_quantity: null
      });

    if (error) {
      console.log(`❌ ${itemName} → ${supplierCode}: ${error.message}`);
      stats.failed++;
    } else {
      console.log(`✅ ${itemName} → ${vendor.name}`);
      stats.created++;
    }
  }

  console.log('\n============================================================');
  console.log('MAPPING SUMMARY');
  console.log('============================================================');
  console.log(`✅ Processed: ${stats.processed} items`);
  console.log(`➕ Vendors created: ${stats.vendorsCreated}`);
  console.log(`✅ Created: ${stats.created} item-vendor links`);
  console.log(`⏭️  Skipped: ${stats.skipped} (already mapped)`);
  console.log(`⚠️  No vendor: ${stats.noVendor} items`);
  console.log(`❌ Failed: ${stats.failed} items`);
  console.log('============================================================\n');
}

mapItemVendors().catch(console.error);
