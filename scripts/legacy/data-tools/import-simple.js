const fs = require('fs');
const https = require('https');

// Configuration
const SUPABASE_URL = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const DEFAULT_TENANT_ID = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'; // SAK Solutions

// Load processed items
const items = JSON.parse(fs.readFileSync('master-items-processed.json', 'utf8'));

console.log('SAIF AUTOMATIONS - MASTER DATA IMPORT');
console.log('=====================================');
console.log(`Items to import: ${items.length}\n`);

const log = {
  vendors: [],
  items: [],
  errors: []
};

async function importData() {
  // Step 1: Import unique vendors
  const uniqueVendors = [...new Set(items.map(i => i.supplier).filter(s => s && s.trim()))];
  console.log(`\n📦 Importing ${uniqueVendors.length} vendors...`);
  
  const vendorMap = {};
  
  for (const vendorName of uniqueVendors) {
    try {
      const vendor = {
        tenant_id: DEFAULT_TENANT_ID,
        code: generateCode(vendorName),
        name: vendorName.trim(),
        legal_name: vendorName.trim(),
        is_active: true
      };
      
      const result = await supabaseInsert('vendors', vendor);
      vendorMap[vendorName] = result.id;
      log.vendors.push({ name: vendorName, id: result.id });
      if (log.vendors.length % 10 === 0) {
        console.log(`  ${log.vendors.length}/${uniqueVendors.length} vendors...`);
      }
    } catch (error) {
      log.errors.push({ type: 'vendor', name: vendorName, error: error.message });
    }
  }
  
  console.log(`✅ ${log.vendors.length}/${uniqueVendors.length} vendors imported\n`);
  
  // Step 2: Import items
  console.log(`\n📋 Importing ${items.length} items...`);
  
  for (let i = 0; i < items.length; i++) {
    const rawItem = items[i];
    try {
      const category = determineCategoryFromPartNumber(rawItem.sas_part_number);
      
      const item = {
        tenant_id: DEFAULT_TENANT_ID,
        code: rawItem.sas_part_number || `ITEM-${String(i + 1).padStart(4, '0')}`,
        name: (rawItem.raw_material_name || 'Unnamed Item').substring(0, 200),
        description: [
          rawItem.raw_material_name,
          rawItem.oem_part_number ? `OEM: ${rawItem.oem_part_number}` : '',
          rawItem.supplier ? `Supplier: ${rawItem.supplier}` : '',
          rawItem.gst_rate ? `GST: ${rawItem.gst_rate}%` : '',
          rawItem.cost ? `Cost: ₹${rawItem.cost}` : '',
          rawItem.responsible_person ? `Resp: ${rawItem.responsible_person}` : ''
        ].filter(s => s).join(' | '),
        type: 'RAW_MATERIAL',
        category: category,
        hsn_code: rawItem.hsn_code || null,
        uom: normalizeUnit(rawItem.unit_of_measure),
        reorder_level: rawItem.threshold_stock || 0,
        is_active: true
      };
      
      const result = await supabaseInsert('items', item);
      log.items.push({ 
        code: item.code,
        name: item.name.substring(0, 50),
        id: result.id 
      });
      
      if ((i + 1) % 50 === 0) {
        console.log(`  ${i + 1}/${items.length} items...`);
      }
    } catch (error) {
      log.errors.push({ 
        type: 'item',
        code: rawItem.sas_part_number,
        name: rawItem.raw_material_name,
        error: error.message 
      });
    }
  }
  
  console.log(`✅ ${log.items.length}/${items.length} items imported\n`);
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Vendors: ${log.vendors.length}/${uniqueVendors.length}`);
  console.log(`Items:   ${log.items.length}/${items.length}`);
  console.log(`Errors:  ${log.errors.length}`);
  
  if (log.errors.length > 0) {
    console.log('\n⚠️  ERRORS:');
    log.errors.slice(0, 10).forEach(e => {
      console.log(`  ${e.type}: ${e.name || e.code} - ${e.error}`);
    });
    if (log.errors.length > 10) {
      console.log(`  ... and ${log.errors.length - 10} more errors`);
    }
  }
  
  // Save log
  fs.writeFileSync('import-log-simplified.json', JSON.stringify(log, null, 2));
  console.log(`\n✅ Log saved to import-log-simplified.json`);
}

function generateCode(name) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 10);
}

function determineCategoryFromPartNumber(partNumber) {
  if (!partNumber) return 'GENERAL';
  
  const prefix = partNumber.split('-')[0];
  const map = {
    'RAD': 'ELECTRONICS',
    'SIC': 'ELECTRONICS',
    'MOD': 'ELECTRONICS',
    'CON': 'ELECTRICAL',
    'CAB': 'ELECTRICAL',
    'BAT': 'ELECTRICAL',
    'LED': 'ELECTRONICS',
    'FAS': 'FASTENERS',
    'FAB': 'FABRICATION',
    'MAC': 'MECHANICAL',
    'SWI': 'ELECTRICAL',
    'IND': 'ELECTRONICS',
    'SEN': 'ELECTRONICS',
    'ACT': 'MECHANICAL',
    'CHM': 'CHEMICAL',
    'SLN': 'CHEMICAL',
    'HET': 'MATERIAL',
    'PKG': 'PACKAGING',
    'TOL': 'TOOLS',
    'GAC': 'GENERAL'
  };
  
  return map[prefix] || 'GENERAL';
}

function normalizeUnit(unit) {
  if (!unit) return 'PCS';
  
  const map = {
    'number': 'PCS',
    'numbers': 'PCS',
    'piece': 'PCS',
    'meter': 'MTR',
    'kilogram': 'KG',
    'gram': 'GM',
    'liter': 'LTR'
  };
  
  const normalized = unit.toLowerCase().trim();
  return map[normalized] || unit.toUpperCase().substring(0, 10);
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

importData().catch(console.error);
