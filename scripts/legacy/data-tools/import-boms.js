const XLSX = require('xlsx');
const fs = require('fs');
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nwkaruzvzwwuftjquypk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const TENANT_ID = process.env.TENANT_ID || 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

console.log('='.repeat(80));
console.log('SAIF AUTOMATIONS - BOM IMPORT');
console.log('='.repeat(80));

const log = {
  finishedGoods: [],
  subAssemblies: [],
  boms: [],
  bomItems: [],
  errors: []
};

async function importBOMs() {
  const workbook = XLSX.readFile('3. Master List of Raw Material Saif Automations (1).xlsx');
  
  // Get existing items from database to match by name
  console.log('\n📋 Fetching existing items from database...');
  const existingItems = await supabaseGet('items', 'select=id,code,name');
  console.log(`Found ${existingItems.length} items in database`);
  
  const itemsByName = {};
  const itemsByCode = {};
  existingItems.forEach(item => {
    itemsByName[item.name.toLowerCase().trim()] = item;
    itemsByCode[item.code.toLowerCase().trim()] = item;
  });
  
  // Step 1: Import Finished Goods
  console.log('\n' + '='.repeat(80));
  console.log('STEP 1: IMPORTING FINISHED GOODS');
  console.log('='.repeat(80));
  
  const fgSheet = XLSX.utils.sheet_to_json(workbook.Sheets['FG'], { defval: '', raw: false });
  const finishedGoods = fgSheet
    .slice(1) // Skip header
    .filter(row => row['__EMPTY'] && row['FINISHED GOODS NAME SHEET'])
    .map(row => ({
      sl_no: row['__EMPTY'],
      name: row['FINISHED GOODS NAME SHEET'],
      part_number: row['__EMPTY_1'] || '',
      uom: row['__EMPTY_2'] || 'Number',
      description: row['__EMPTY_3'] || ''
    }));
  
  console.log(`Found ${finishedGoods.length} finished goods`);
  
  for (const fg of finishedGoods) {
    try {
      const item = {
        tenant_id: TENANT_ID,
        code: fg.part_number || `FG-${String(fg.sl_no).padStart(3, '0')}`,
        name: fg.name.substring(0, 200),
        description: fg.description,
        type: 'FINISHED_GOODS',
        category: 'FINISHED_GOODS',
        uom: fg.uom,
        is_active: true
      };
      
      const result = await supabaseInsert('items', item);
      log.finishedGoods.push({ name: fg.name, id: result.id });
      itemsByName[fg.name.toLowerCase().trim()] = result;
      
      if (log.finishedGoods.length % 10 === 0) {
        console.log(`  ${log.finishedGoods.length} finished goods...`);
      }
    } catch (error) {
      log.errors.push({ type: 'finished_good', name: fg.name, error: error.message });
    }
  }
  
  console.log(`✅ ${log.finishedGoods.length}/${finishedGoods.length} finished goods imported`);
  
  // Step 2: Import Sub-assemblies as Semi-Finished items
  console.log('\n' + '='.repeat(80));
  console.log('STEP 2: IMPORTING SUB-ASSEMBLIES');
  console.log('='.repeat(80));
  
  const sbomSheet = XLSX.utils.sheet_to_json(workbook.Sheets['S-BOM'], { defval: '', raw: false });
  const subAssemblyNames = [...new Set(
    sbomSheet
      .slice(1)
      .filter(row => row['SUB-ASSEMBLY BILL OF MATERIAL SHEET'])
      .map(row => row['SUB-ASSEMBLY BILL OF MATERIAL SHEET'])
  )];
  
  console.log(`Found ${subAssemblyNames.length} unique sub-assemblies`);
  
  for (const saName of subAssemblyNames) {
    try {
      // Check if already exists
      if (itemsByName[saName.toLowerCase().trim()]) {
        log.subAssemblies.push({ name: saName, id: itemsByName[saName.toLowerCase().trim()].id, existed: true });
        continue;
      }
      
      const item = {
        tenant_id: TENANT_ID,
        code: generateCode(saName, 'SA'),
        name: saName.substring(0, 200),
        description: 'Sub-assembly',
        type: 'SUBASSEMBLY',
        category: 'SUBASSEMBLY',
        uom: 'Number',
        is_active: true
      };
      
      const result = await supabaseInsert('items', item);
      log.subAssemblies.push({ name: saName, id: result.id, existed: false });
      itemsByName[saName.toLowerCase().trim()] = result;
      
      if (log.subAssemblies.filter(s => !s.existed).length % 10 === 0) {
        console.log(`  ${log.subAssemblies.length} sub-assemblies...`);
      }
    } catch (error) {
      log.errors.push({ type: 'sub_assembly', name: saName, error: error.message });
    }
  }
  
  console.log(`✅ ${log.subAssemblies.filter(s => !s.existed).length} new sub-assemblies imported (${log.subAssemblies.filter(s => s.existed).length} already existed)`);
  
  // Step 3: Create Sub-assembly BOMs (Sub-assemblies → Raw Materials)
  console.log('\n' + '='.repeat(80));
  console.log('STEP 3: CREATING SUB-ASSEMBLY BOMs');
  console.log('='.repeat(80));
  
  const subBoms = sbomSheet
    .slice(1)
    .filter(row => row['SUB-ASSEMBLY BILL OF MATERIAL SHEET'] && row['__EMPTY'])
    .map(row => ({
      parent: row['SUB-ASSEMBLY BILL OF MATERIAL SHEET'],
      child: row['__EMPTY'],
      quantity: parseFloat(row['__EMPTY_1']) || 1,
      uom: row['__EMPTY_2'] || 'Number'
    }));
  
  const subBomsByParent = {};
  subBoms.forEach(bom => {
    if (!subBomsByParent[bom.parent]) {
      subBomsByParent[bom.parent] = [];
    }
    subBomsByParent[bom.parent].push(bom);
  });
  
  console.log(`Found ${Object.keys(subBomsByParent).length} sub-assembly BOMs to create`);
  
  let subBomCount = 0;
  let subBomItemCount = 0;
  
  for (const [parentName, items] of Object.entries(subBomsByParent)) {
    try {
      const parentItem = itemsByName[parentName.toLowerCase().trim()];
      if (!parentItem) {
        log.errors.push({ type: 'sub_bom', name: parentName, error: 'Parent sub-assembly not found' });
        continue;
      }
      
      // Create BOM header
      const bom = {
        tenant_id: TENANT_ID,
        item_id: parentItem.id,
        version: 1,
        is_active: true
      };
      
      const bomResult = await supabaseInsert('bom_headers', bom);
      subBomCount++;

      // Keep reference so we can link FG BOMs to these sub-assembly BOMs later
      parentItem._bomId = bomResult.id;
      
      // Create BOM items
      for (const item of items) {
        let childItem = itemsByName[item.child.toLowerCase().trim()];
        
        // Try fuzzy match
        if (!childItem) {
          const fuzzyMatch = Object.keys(itemsByName).find(key => 
            key.includes(item.child.toLowerCase()) || item.child.toLowerCase().includes(key)
          );
          if (fuzzyMatch) {
            childItem = itemsByName[fuzzyMatch];
          }
        }
        
        if (!childItem) {
          log.errors.push({ type: 'sub_bom_item', parent: parentName, child: item.child, error: 'Component not found' });
          continue;
        }
        
        const bomItem = {
          bom_id: bomResult.id,
          item_id: childItem.id,
          quantity: item.quantity
        };
        
        await supabaseInsert('bom_items', bomItem);
        subBomItemCount++;
      }
      
      if (subBomCount % 10 === 0) {
        console.log(`  ${subBomCount} sub-assembly BOMs created...`);
      }
    } catch (error) {
      log.errors.push({ type: 'sub_bom', name: parentName, error: error.message });
    }
  }
  
  console.log(`✅ ${subBomCount} sub-assembly BOMs created with ${subBomItemCount} items`);

  // Step 4: Create Assembly BOMs (Finished Goods → Sub-assemblies) and link sub-assemblies as BOM components
  console.log('\n' + '='.repeat(80));
  console.log('STEP 4: CREATING ASSEMBLY BOMs');
  console.log('='.repeat(80));

  const abomSheet = XLSX.utils.sheet_to_json(workbook.Sheets['A-BOM'], { defval: '', raw: false });
  const assemblyBoms = abomSheet
    .slice(1) // Skip header
    .filter(row => row['FINAL ASSEMBLY BILL OF MATERIAL SHEET'] && row['__EMPTY_1'])
    .map(row => ({
      parent: row['FINAL ASSEMBLY BILL OF MATERIAL SHEET'],
      child: row['__EMPTY_1'],
      quantity: parseFloat(row['__EMPTY_2']) || 1,
      notes: row['__EMPTY_4'] || ''
    }));

  // Group by parent
  const bomsByParent = {};
  assemblyBoms.forEach(bom => {
    if (!bomsByParent[bom.parent]) {
      bomsByParent[bom.parent] = [];
    }
    bomsByParent[bom.parent].push(bom);
  });

  console.log(`Found ${Object.keys(bomsByParent).length} assembly BOMs to create`);

  for (const [parentName, items] of Object.entries(bomsByParent)) {
    try {
      const parentItem = itemsByName[parentName.toLowerCase().trim()];
      if (!parentItem) {
        log.errors.push({ type: 'bom', name: parentName, error: 'Parent item not found' });
        continue;
      }

      // Create BOM header
      const bom = {
        tenant_id: TENANT_ID,
        item_id: parentItem.id,
        version: 1,
        is_active: true
      };

      const bomResult = await supabaseInsert('bom_headers', bom);
      log.boms.push({ parent: parentName, id: bomResult.id });

      // Create BOM items
      for (const item of items) {
        const childItem = itemsByName[item.child.toLowerCase().trim()];
        if (!childItem) {
          log.errors.push({ type: 'bom_item', parent: parentName, child: item.child, error: 'Child item not found' });
          continue;
        }

        // If the component is a sub-assembly and we have a BOM for it, link as child_bom_id
        // so it shows up as BOM (subassembly) in the ERP.
        const childBomId = childItem._bomId || null;
        const bomItem = childBomId
          ? {
              bom_id: bomResult.id,
              child_bom_id: childBomId,
              item_id: null,
              quantity: item.quantity,
              notes: item.notes
            }
          : {
              bom_id: bomResult.id,
              item_id: childItem.id,
              quantity: item.quantity,
              notes: item.notes
            };

        await supabaseInsert('bom_items', bomItem);
        log.bomItems.push({ bom_id: bomResult.id, component: item.child, as_bom: !!childBomId });
      }

      if (log.boms.length % 5 === 0) {
        console.log(`  ${log.boms.length} BOMs created...`);
      }
    } catch (error) {
      log.errors.push({ type: 'bom', name: parentName, error: error.message });
    }
  }

  console.log(`✅ ${log.boms.length} assembly BOMs created with ${log.bomItems.length} items`);
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(80));
  console.log(`Finished Goods:     ${log.finishedGoods.length}`);
  console.log(`Sub-assemblies:     ${log.subAssemblies.length} (${log.subAssemblies.filter(s => !s.existed).length} new)`);
  console.log(`Assembly BOMs:      ${log.boms.length}`);
  console.log(`Sub-assembly BOMs:  ${subBomCount}`);
  console.log(`Total BOM Items:    ${log.bomItems.length + subBomItemCount}`);
  console.log(`Errors:             ${log.errors.length}`);
  
  if (log.errors.length > 0) {
    console.log('\n⚠️  Sample Errors:');
    log.errors.slice(0, 10).forEach(e => {
      console.log(`  ${e.type}: ${e.name || e.parent} - ${e.error}`);
    });
  }
  
  fs.writeFileSync('bom-import-log.json', JSON.stringify(log, null, 2));
  console.log(`\n✅ Log saved to bom-import-log.json`);
}

function generateCode(name, prefix) {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8);
  return `${prefix}-${cleaned}`;
}

async function supabaseGet(table, params = '') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nwkaruzvzwwuftjquypk.supabase.co',
      port: 443,
      path: `/rest/v1/${table}?${params}`,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Invalid JSON'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
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
            reject(new Error('Invalid JSON'));
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

importBOMs().catch(console.error);
