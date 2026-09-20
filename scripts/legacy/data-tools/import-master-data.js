const fs = require('fs');
const https = require('https');

// Configuration
const API_URL = 'http://3.110.100.60:4000';
const SUPABASE_URL = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

// Load processed items
const items = JSON.parse(fs.readFileSync('master-items-processed.json', 'utf8'));

console.log('='.repeat(100));
console.log('MASTER DATA IMPORT - SAIF AUTOMATIONS');
console.log('='.repeat(100));
console.log(`Total items to import: ${items.length}\n`);

// Extract unique vendors
const vendorNames = [...new Set(items.map(i => i.supplier).filter(s => s && s.trim()))];
console.log(`Unique vendors found: ${vendorNames.length}\n`);

const importLog = {
  startTime: new Date().toISOString(),
  vendors: { success: [], failed: [] },
  items: { success: [], failed: [] },
  relationships: { success: [], failed: [] },
  summary: {}
};

async function importData() {
  try {
    // STEP 1: Import Vendors
    console.log('\n' + '='.repeat(100));
    console.log('STEP 1: IMPORTING VENDORS');
    console.log('='.repeat(100));
    
    const vendorMap = {};
    
    for (const vendorName of vendorNames) {
      try {
        const vendor = {
          name: vendorName.trim(),
          code: generateVendorCode(vendorName),
          contact_person: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          country: 'India',
          pincode: '',
          gstin: '',
          pan: '',
          payment_terms: 'NET_30',
          status: 'ACTIVE'
        };
        
        const result = await supabaseInsert('vendors', vendor);
        vendorMap[vendorName] = result.id;
        importLog.vendors.success.push({ name: vendorName, id: result.id });
        console.log(`✓ ${vendorName} (ID: ${result.id})`);
      } catch (error) {
        console.error(`✗ ${vendorName}: ${error.message}`);
        importLog.vendors.failed.push({ name: vendorName, error: error.message });
      }
    }
    
    console.log(`\n✅ Vendors: ${importLog.vendors.success.length} success, ${importLog.vendors.failed.length} failed`);
    
    // STEP 2: Import Items
    console.log('\n' + '='.repeat(100));
    console.log('STEP 2: IMPORTING ITEMS');
    console.log('='.repeat(100));
    
    let itemCount = 0;
    const itemMap = {};
    
    for (const rawItem of items) {
      try {
        // Determine category from SAS part number prefix
        const category = determineCategoryFromPartNumber(rawItem.sas_part_number);
        
        const item = {
          code: rawItem.sas_part_number || `ITEM-${String(itemCount + 1).padStart(4, '0')}`,
          name: rawItem.raw_material_name || 'Unnamed Item',
          description: `${rawItem.raw_material_name || ''}${rawItem.oem_part_number ? ' | OEM: ' + rawItem.oem_part_number : ''}`.trim(),
          type: 'RAW_MATERIAL',
          category: category,
          hsn_code: rawItem.hsn_code || '',
          uom: normalizeUnit(rawItem.unit_of_measure),
          reorder_level: rawItem.threshold_stock || 0,
          is_active: true,
          specifications: {
            manufacturer_part_number: rawItem.oem_part_number || '',
            gst_rate: rawItem.gst_rate || 18,
            responsible_person: rawItem.responsible_person || '',
            is_lifebuoy: rawItem.is_lifebuoy || false
          }
        };
        
        const result = await supabaseInsert('items', item);
        itemMap[rawItem.sl_no] = {
          itemId: result.id,
          cost: rawItem.cost,
          supplier: rawItem.supplier
        };
        importLog.items.success.push({ 
          partNumber: item.part_number, 
          name: item.name,
          id: result.id 
        });
        
        itemCount++;
        if (itemCount % 50 === 0) {
          console.log(`  Progress: ${itemCount}/${items.length} items imported...`);
        }
      } catch (error) {
        console.error(`✗ Item ${rawItem.sl_no} (${rawItem.sas_part_number}): ${error.message}`);
        importLog.items.failed.push({ 
          slNo: rawItem.sl_no,
          partNumber: rawItem.sas_part_number,
          error: error.message 
        });
      }
    }
    
    console.log(`\n✅ Items: ${importLog.items.success.length} success, ${importLog.items.failed.length} failed`);
    
    // STEP 3: Create Item-Vendor Relationships with Prices
    console.log('\n' + '='.repeat(100));
    console.log('STEP 3: CREATING ITEM-VENDOR RELATIONSHIPS');
    console.log('='.repeat(100));
    
    let relationshipCount = 0;
    
    for (const [slNo, itemData] of Object.entries(itemMap)) {
      try {
        if (itemData.supplier && vendorMap[itemData.supplier] && itemData.cost > 0) {
          const relationship = {
            item_id: itemData.itemId,
            vendor_id: vendorMap[itemData.supplier],
            vendor_part_number: items.find(i => i.sl_no === slNo)?.oem_part_number || '',
            is_preferred: true,
            lead_time_days: 7,
            minimum_order_quantity: 1,
            price: itemData.cost,
            status: 'ACTIVE'
          };
          
          await supabaseInsert('item_vendor_preferences', relationship);
          importLog.relationships.success.push({
            itemId: itemData.itemId,
            vendorId: vendorMap[itemData.supplier]
          });
          
          relationshipCount++;
          if (relationshipCount % 50 === 0) {
            console.log(`  Progress: ${relationshipCount} relationships created...`);
          }
        }
      } catch (error) {
        console.error(`✗ Relationship for item ${itemData.itemId}: ${error.message}`);
        importLog.relationships.failed.push({
          itemId: itemData.itemId,
          error: error.message
        });
      }
    }
    
    console.log(`\n✅ Relationships: ${importLog.relationships.success.length} success, ${importLog.relationships.failed.length} failed`);
    
    // Summary
    console.log('\n' + '='.repeat(100));
    console.log('IMPORT SUMMARY');
    console.log('='.repeat(100));
    
    importLog.summary = {
      vendors: {
        total: vendorNames.length,
        success: importLog.vendors.success.length,
        failed: importLog.vendors.failed.length
      },
      items: {
        total: items.length,
        success: importLog.items.success.length,
        failed: importLog.items.failed.length
      },
      relationships: {
        total: relationshipCount,
        success: importLog.relationships.success.length,
        failed: importLog.relationships.failed.length
      }
    };
    
    console.log(`\nVendors:       ${importLog.summary.vendors.success}/${importLog.summary.vendors.total} imported`);
    console.log(`Items:         ${importLog.summary.items.success}/${importLog.summary.items.total} imported`);
    console.log(`Relationships: ${importLog.summary.relationships.success}/${importLog.summary.relationships.total} created`);
    
    importLog.endTime = new Date().toISOString();
    
    // Save log
    fs.writeFileSync('import-log.json', JSON.stringify(importLog, null, 2));
    console.log(`\n✅ Import log saved to import-log.json`);
    
    console.log('\n' + '='.repeat(100));
    console.log('✅ IMPORT COMPLETE!');
    console.log('='.repeat(100));
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    importLog.fatalError = error.message;
    fs.writeFileSync('import-log.json', JSON.stringify(importLog, null, 2));
  }
}

// Helper Functions
function generateVendorCode(name) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 10);
}

function determineCategoryFromPartNumber(partNumber) {
  if (!partNumber) return 'GENERAL';
  
  const prefix = partNumber.split('-')[0];
  const categoryMap = {
    'RAD': 'ELECTRONICS',
    'SIC': 'ELECTRONICS',
    'MOD': 'ELECTRONICS',
    'CON': 'ELECTRICAL',
    'CAB': 'ELECTRICAL',
    'BAT': 'ELECTRICAL',
    'LED': 'ELECTRONICS',
    'PCB': 'ELECTRONICS',
    'MCH': 'MECHANICAL',
    'PLT': 'PLASTIC',
    'MET': 'METAL',
    'FAS': 'FASTENERS',
    'CHE': 'CHEMICAL'
  };
  
  return categoryMap[prefix] || 'GENERAL';
}

function normalizeUnit(unit) {
  if (!unit) return 'PCS';
  
  const unitMap = {
    'number': 'PCS',
    'numbers': 'PCS',
    'piece': 'PCS',
    'pieces': 'PCS',
    'meter': 'MTR',
    'meters': 'MTR',
    'kilogram': 'KG',
    'gram': 'GM',
    'liter': 'LTR',
    'set': 'SET',
    'pair': 'PAIR',
    'box': 'BOX',
    'packet': 'PKT'
  };
  
  const normalized = unit.toLowerCase().trim();
  return unitMap[normalized] || unit.toUpperCase().substring(0, 10);
}

async function supabaseInsert(table, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'nwkaruzvzwwuftjquypk.supabase.co',
      port: 443,
      path: `/rest/v1/${table}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(body);
            resolve(Array.isArray(result) ? result[0] : result);
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Run import
importData().catch(console.error);
