/**
 * Import BOMs via API endpoints (bypasses Supabase schema issues)
 * Run from: npm install axios first, then: node import-boms-via-api.js
 */

const xlsx = require('xlsx');
const axios = require('axios');

const API_URL = 'http://localhost:4000/api';
const TENANT_ID = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

// You'll need an auth token - get it from the running web app (inspect network tab)
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT_ID
  }
});

async function importBomsViaAPI() {
  console.log('============================================================');
  console.log('IMPORTING BOMs VIA API');
  console.log('============================================================\n');

  // Step 1: Get all items to build lookup map
  console.log('Fetching items from API...');
  const itemsRes = await api.get('/items');
  const items = itemsRes.data;
  
  const itemMap = new Map();
  items.forEach(item => {
    itemMap.set(item.code, item);
    itemMap.set(item.name.toUpperCase(), item);
  });
  
  console.log(`Found ${items.length} items\n`);

  // Step 2: Read BOM sheets
  const wb = xlsx.readFile('BOM-LIST.xlsx');
  const bomSheets = wb.SheetNames.filter(name => 
    !['RM', 'VENDORS', 'Summary'].includes(name) && 
    /^\d+-/.test(name)
  );

  console.log(`Found ${bomSheets.length} BOM sheets\n`);

  let created = 0;
  let failed = 0;

  for (const sheetName of bomSheets) {
    const sheet = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    if (data.length < 2) continue;

    // Extract parent item name from sheet name
    const parentItemName = sheetName.replace(/^\d+-/, '').trim();
    
    // Find parent item
    let parentItem = null;
    for (const [key, item] of itemMap) {
      if (typeof key === 'string' && 
          (item.name.toUpperCase().includes(parentItemName.toUpperCase()) ||
           parentItemName.toUpperCase().includes(item.name.toUpperCase()))) {
        parentItem = item;
        break;
      }
    }

    if (!parentItem) {
      console.log(`⚠️  Skipping "${sheetName}" - parent item not found`);
      failed++;
      continue;
    }

    try {
      // Create BOM header via API
      const bomData = {
        itemId: parentItem.id,
        version: '1.0',
        description: `BOM for ${parentItem.name}`,
        validFrom: new Date().toISOString()
      };

      const bomRes = await api.post('/bom/headers', bomData);
      const bom = bomRes.data;

      // Parse components
      const headerRow = data[1]; // Row 2 (index 1)
      const dataRows = data.slice(2);
      
      let componentsAdded = 0;
      
      for (const row of dataRows) {
        const componentName = String(row[headerRow.indexOf('RAW MATERIAL NAME')] || '').trim();
        if (!componentName) continue;

        const componentPartNumber = String(row[headerRow.indexOf('SAS Part Number')] || '').trim();
        const quantity = parseFloat(row[headerRow.indexOf(parentItemName)] || row[headerRow.indexOf(sheetName)] || 1);

        // Find component item
        const componentItem = itemMap.get(componentPartNumber) ||
                             itemMap.get(componentName.toUpperCase());

        if (!componentItem) {
          console.log(`    ⚠️  Component not found: ${componentName}`);
          continue;
        }

        // Add component via API
        await api.post('/bom/items', {
          bomId: bom.id,
          itemId: componentItem.id,
          quantity: quantity || 1,
          uom: componentItem.uom || 'NOS'
        });

        componentsAdded++;
      }

      console.log(`✅ ${parentItem.name} - ${componentsAdded} components`);
      created++;

    } catch (error) {
      console.log(`❌ ${parentItem.name}: ${error.response?.data?.message || error.message}`);
      failed++;
    }
  }

  console.log(`\n============================================================`);
  console.log(`IMPORT SUMMARY`);
  console.log(`============================================================`);
  console.log(`✅ BOMs created: ${created}`);
  console.log(`❌ BOMs failed: ${failed}`);
  console.log(`============================================================\n`);
}

// Run if AUTH_TOKEN is set
if (AUTH_TOKEN !== 'YOUR_AUTH_TOKEN_HERE') {
  importBomsViaAPI().catch(console.error);
} else {
  console.log('❌ Please set AUTH_TOKEN in the script before running');
  console.log('   Get your token from the browser:');
  console.log('   1. Open http://localhost:3000 and log in');
  console.log('   2. Open DevTools > Network tab');
  console.log('   3. Look for any API request');
  console.log('   4. Copy the Authorization header value (after "Bearer ")');
}
