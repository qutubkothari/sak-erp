const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

const log = {
  vendors: { success: [], failed: [] },
  items: { success: [], failed: [] },
  boms: { success: [], failed: [] },
  itemVendors: { success: [], failed: [] }
};

// Helper to create unique code
function createCode(name, existingCodes, maxLength = 10) {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, maxLength - 4);
  
  let code = base;
  let counter = 1;
  
  while (existingCodes.has(code)) {
    const suffix = String(counter).padStart(4, '0');
    code = base.substring(0, maxLength - suffix.length) + suffix;
    counter++;
  }
  
  existingCodes.add(code);
  return code;
}

async function importVendors() {
  console.log('\n=== STEP 1: Importing Vendors ===\n');
  
  const wb = xlsx.readFile('VENDORS.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  
  console.log(`Found ${data.length} vendors in VENDORS.xlsx\n`);
  
  const vendorCodes = new Set();
  const vendorMap = new Map(); // name -> vendor object
  
  for (const row of data) {
    const vendorName = String(row['Vendor Name'] || '').trim();
    if (!vendorName) continue;
    
    const vendorCode = createCode(vendorName, vendorCodes);
    
    const vendorData = {
      tenant_id: tenantId,
      code: vendorCode,
      name: vendorName,
      legal_name: String(row['Legal Name'] || vendorName).trim(),
      email: String(row['Email'] || '').trim().toLowerCase() || null,
      phone: String(row['Phone'] || '').trim() || null,
      tax_id: String(row['Tax ID/GSTIN'] || '').trim() || null,
      contact_person: String(row['Contact Person'] || '').trim() || null,
      category: String(row['Category'] || '').trim() || null,
      payment_terms: 'NET_30',
      credit_limit: parseFloat(row['Credit Limit']) || 100000,
      country: 'India',
      is_active: true
    };
    
    try {
      // Try to get existing vendor first
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select()
        .eq('tenant_id', tenantId)
        .eq('code', vendorCode)
        .single();
      
      if (existingVendor) {
        vendorMap.set(vendorName.toUpperCase(), existingVendor);
        console.log(`⏭️  ${vendorName} (${vendorCode}) - already exists`);
        continue;
      }
      
      const { data: vendor, error } = await supabase
        .from('vendors')
        .insert(vendorData)
        .select()
        .single();
      
      if (error) throw error;
      
      vendorMap.set(vendorName.toUpperCase(), vendor);
      log.vendors.success.push(vendorName);
      console.log(`✅ ${vendorName} (${vendorCode})`);
    } catch (error) {
      log.vendors.failed.push({ name: vendorName, error: error.message });
      console.log(`❌ ${vendorName}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Vendors: ${log.vendors.success.length} imported, ${log.vendors.failed.length} failed\n`);
  return vendorMap;
}

async function importItems(vendorMap) {
  console.log('\n=== STEP 2: Importing Items from RM Sheet ===\n');
  
  const wb = xlsx.readFile('BOM-LIST.xlsx');
  const sheet = wb.Sheets['RM'];
  const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Header is at row 2 (index 1)
  const headerRowIndex = 1;
  const headers = rawData[headerRowIndex];
  const dataRows = rawData.slice(headerRowIndex + 1);
  
  // Convert to objects
  const items = dataRows
    .map(row => {
      const obj = {};
      headers.forEach((header, idx) => {
        if (header) obj[header] = row[idx] || '';
      });
      return obj;
    })
    .filter(row => {
      const name = String(row['RAW MATERIAL NAME'] || '').trim();
      return name && name !== 'RAW MATERIAL NAME' && name !== ''; // Skip empty
    });
  
  console.log(`Found ${items.length} items in RM sheet\n`);
  
  const itemCodes = new Set();
  const itemMap = new Map(); // part number -> item object
  const processedPartNumbers = new Set(); // Track to avoid duplicates
  
  for (const row of items) {
    const itemName = String(row['RAW MATERIAL NAME'] || '').trim();
    const partNumber = String(row['SAS Part Number'] || '').trim();
    const oemPartNumber = String(row['OEM Part Number'] || '').trim();
    const supplier = String(row['SUPPLIER'] || '').trim();
    const uom = String(row['UNIT OF MEASURE'] || 'Nos').trim();
    
    if (!itemName) continue;
    
    // Skip if we already processed this part number (handle duplicates)
    if (partNumber && processedPartNumbers.has(partNumber)) {
      console.log(`⚠️  Skipping duplicate part number: ${partNumber} (${itemName})`);
      continue;
    }
    
    const itemCode = partNumber || createCode(itemName, itemCodes, 20);
    if (partNumber) processedPartNumbers.add(partNumber);
    
    // Determine if this is a sub-assembly (IN HOUSE supplier)
    const isSubAssembly = supplier.toUpperCase().includes('IN HOUSE') || 
                          supplier.toUpperCase().includes('INHOUSE');
    
    const itemData = {
      tenant_id: tenantId,
      code: itemCode,
      name: itemName,
      description: oemPartNumber ? `OEM Part: ${oemPartNumber}` : itemName,
      type: isSubAssembly ? 'SUB_ASSEMBLY' : 'RAW_MATERIAL',
      category: isSubAssembly ? 'Sub Assembly' : 'GENERAL',
      product_category: isSubAssembly ? 'SUB ASSEMBLIES' : null,
      uom: uom,
      is_active: true,
      metadata: {
        sas_part_number: partNumber || null,
        oem_part_number: oemPartNumber || null,
        supplier: supplier,
        source: 'BOM-LIST.xlsx'
      }
    };
    
    try {
      // Try to get existing item first
      const { data: existingItem } = await supabase
        .from('items')
        .select()
        .eq('tenant_id', tenantId)
        .eq('code', itemCode)
        .single();
      
      if (existingItem) {
        itemMap.set(partNumber || itemName, existingItem);
        console.log(`⏭️  ${itemName} (${itemCode}) - already exists`);
        continue;
      }
      
      const { data: item, error } = await supabase
        .from('items')
        .insert(itemData)
        .select()
        .single();
      
      if (error) throw error;
      
      itemMap.set(partNumber || itemName, item);
      log.items.success.push(itemName);
      
      // Link to vendor if supplier is specified and not IN HOUSE
      if (supplier && !isSubAssembly) {
        const vendor = vendorMap.get(supplier.toUpperCase());
        if (vendor) {
          try {
            await supabase.from('item_vendors').insert({
              tenant_id: tenantId,
              item_id: item.id,
              vendor_id: vendor.id,
              is_preferred: true
            });
            log.itemVendors.success.push(`${itemName} → ${supplier}`);
          } catch (e) {
            log.itemVendors.failed.push({ item: itemName, vendor: supplier, error: e.message });
          }
        }
      }
      
      console.log(`✅ ${itemName} (${itemCode})${isSubAssembly ? ' [SUB-ASSEMBLY]' : ''}`);
    } catch (error) {
      log.items.failed.push({ name: itemName, error: error.message });
      console.log(`❌ ${itemName}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Items: ${log.items.success.length} imported, ${log.items.failed.length} failed`);
  console.log(`✅ Item-Vendor Links: ${log.itemVendors.success.length} created\n`);
  
  return itemMap;
}

async function importBOMs(itemMap, vendorMap) {
  console.log('\n=== STEP 3: Importing BOMs from Sub-Assembly Sheets ===\n');
  
  const wb = xlsx.readFile('BOM-LIST.xlsx');
  
  // Get all sub-assembly sheets (exclude RM and utility sheets)
  const excludeSheets = ['RM', 'Purchase Order List', 'S-BOM', 'MRP', 'Supplier MRP', 
                         'Supplier Items', 'CombineSFG', 'CombineFG', 'Help', 
                         'Parts List', 'S-Parts List', 'PO', 'A-BOM', 'FG', 'Inv',
                         'GRN-IMP', 'Where Used', 'GRN', 'S-FG', 'Issue', 'Projects',
                         'Project Parts', 'PR-BOM', 'IssueBOM', 'MRPback', 'IRegback'];
  
  const bomSheets = wb.SheetNames.filter(name => !excludeSheets.includes(name));
  
  console.log(`Found ${bomSheets.length} BOM sheets\n`);
  
  for (const sheetName of bomSheets) {
    const sheet = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    
    if (data.length === 0) continue;
    
    // Extract parent item name from sheet name
    const parentItemName = sheetName.replace(/^\d+-/, '').trim();
    
    // Find parent item by name - prefer exact matches and SUB_ASSEMBLY over RAW_MATERIAL
    let parentItem = null;
    const candidates = [];
    
    for (const [key, item] of itemMap) {
      const itemNameUpper = item.name.toUpperCase();
      const sheetNameUpper = parentItemName.toUpperCase();
      
      // Check for match
      if (itemNameUpper === sheetNameUpper) {
        // Exact match
        candidates.push({ item, matchType: 'exact', score: 100 });
      } else if (itemNameUpper.includes(sheetNameUpper) || sheetNameUpper.includes(itemNameUpper)) {
        // Partial match
        const score = Math.min(itemNameUpper.length, sheetNameUpper.length) / 
                     Math.max(itemNameUpper.length, sheetNameUpper.length) * 50;
        candidates.push({ item, matchType: 'partial', score });
      }
    }
    
    // Sort candidates: exact matches first, then SUB_ASSEMBLY over RAW_MATERIAL, then by score
    candidates.sort((a, b) => {
      if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
      if (a.matchType !== 'exact' && b.matchType === 'exact') return 1;
      
      const aIsSub = a.item.type === 'SUB_ASSEMBLY' ? 1 : 0;
      const bIsSub = b.item.type === 'SUB_ASSEMBLY' ? 1 : 0;
      if (aIsSub !== bIsSub) return bIsSub - aIsSub;
      
      return b.score - a.score;
    });
    
    if (candidates.length > 0) {
      parentItem = candidates[0].item;
      if (candidates.length > 1) {
        console.log(`   Multiple matches for "${sheetName}", chose: ${parentItem.name} (${parentItem.type})`);
      }
    }
    
    if (!parentItem) {
      console.log(`⚠️  Skipping "${sheetName}" - parent item not found`);
      continue;
    }
    
    // Check if BOM already exists for this item
    const { data: existingBom, error: checkError } = await supabase
      .from('bom_headers')
      .select('id, version')
      .eq('tenant_id', tenantId)
      .eq('item_id', parentItem.id)
      .maybeSingle();
    
    if (existingBom) {
      console.log(`⏭️  ${parentItem.name} - BOM already exists (v${existingBom.version}), skipping`);
      continue;
    }
    
    try {
      // Create BOM header with actual database schema
      const { data: bomHeader, error: bomError } = await supabase
        .from('bom_headers')
        .insert({
          tenant_id: tenantId,
          item_id: parentItem.id,
          version: 1,
          is_active: true,
          effective_from: new Date().toISOString(),
          notes: `Imported from BOM-LIST.xlsx sheet: ${sheetName}`
        })
        .select()
        .single();
      
      if (bomError) {
        console.log(`Full error for ${parentItem.name}:`, JSON.stringify(bomError, null, 2));
        throw bomError;
      }
      
      // Create BOM items
      let sequence = 1;
      for (const row of data) {
        const componentName = String(row['RAW MATERIAL NAME'] || '').trim();
        const componentPartNumber = String(row['SAS Part Number'] || '').trim();
        const supplier = String(row['SUPPLIER'] || '').trim();
        const quantity = parseFloat(row[parentItemName] || row[sheetName] || 1);
        
        if (!componentName) continue;
        
        // Find component item
        const componentItem = itemMap.get(componentPartNumber) ||
                             itemMap.get(componentName) ||
                             Array.from(itemMap.values()).find(item => 
                               item.name.toUpperCase() === componentName.toUpperCase()
                             );
        
        if (!componentItem) {
          console.log(`  ⚠️  Component not found: ${componentName}`);
          continue;
        }
        
        await supabase.from('bom_items').insert({
          bom_id: bomHeader.id,
          item_id: componentItem.id,
          quantity: quantity || 1,
          sequence: sequence++,
          scrap_percentage: 0,
          notes: supplier ? `Supplier: ${supplier}` : null
        });
      }
      
      log.boms.success.push(parentItem.name);
      console.log(`✅ ${parentItem.name} - ${sequence - 1} components`);
    } catch (error) {
      log.boms.failed.push({ name: parentItem.name, error: error.message });
      console.log(`❌ ${parentItem.name}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ BOMs: ${log.boms.success.length} created, ${log.boms.failed.length} failed\n`);
}

async function main() {
  console.log('============================================================');
  console.log('IMPORT VENDORS, ITEMS, AND BOMs');
  console.log('============================================================');
  
  try {
    const vendorMap = await importVendors();
    const itemMap = await importItems(vendorMap);
    await importBOMs(itemMap, vendorMap);
    
    console.log('\n============================================================');
    console.log('IMPORT SUMMARY');
    console.log('============================================================');
    console.log(`\n✅ Vendors: ${log.vendors.success.length} imported`);
    console.log(`✅ Items: ${log.items.success.length} imported`);
    console.log(`✅ Item-Vendor Links: ${log.itemVendors.success.length} created`);
    console.log(`✅ BOMs: ${log.boms.success.length} created`);
    
    if (log.vendors.failed.length > 0 || log.items.failed.length > 0 || log.boms.failed.length > 0) {
      console.log('\n⚠️  Some imports failed. Check the logs above.');
    }
    
    console.log('\n✅ Import completed!\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
