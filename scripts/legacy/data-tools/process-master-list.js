const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const workbook = XLSX.readFile('3. Master List of Raw Material Saif Automations (1).xlsx');
const worksheet = workbook.Sheets['RM'];

// Read with header row at row 1
const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

// First row contains actual headers
const headerRow = rawData[0];

// Map __EMPTY columns to actual header names
const columnMapping = {
  '165': headerRow['165'], // UNIT OF MEASURE
  '__EMPTY': headerRow['__EMPTY'], // Sl No.
  '__EMPTY_1': headerRow['__EMPTY_1'], // whether LifeBuoy?
  '__EMPTY_2': headerRow['__EMPTY_2'], // Responsible Person
  '__EMPTY_3': headerRow['__EMPTY_3'], // Threshold Stock
  '__EMPTY_4': headerRow['__EMPTY_4'], // How Many Crafts
  '__EMPTY_5': headerRow['__EMPTY_5'], // quantity to be ordered
  '__EMPTY_6': headerRow['__EMPTY_6'], // HSN Codes
  'Colum O to T should only Be Copied for Purchase Order': headerRow['Colum O to T should only Be Copied for Purchase Order'], // RAW MATERIAL NAME
  '__EMPTY_7': headerRow['__EMPTY_7'], // SAS Part Number
  '__EMPTY_8': headerRow['__EMPTY_8'], // OEM Part Number
  '__EMPTY_9': headerRow['__EMPTY_9'], // Required Quantity
  '__EMPTY_10': headerRow['__EMPTY_10'], // COST
  '__EMPTY_11': headerRow['__EMPTY_11'], // GST Rate
  '__EMPTY_12': headerRow['__EMPTY_12'], // Total Stock In
  '__EMPTY_13': headerRow['__EMPTY_13'], // Required for Single SaifSeas
  'Desired Production: ->': headerRow['Desired Production: ->'], // Order Status
  '__EMPTY_14': headerRow['__EMPTY_14'], // SUPPLIER
  '__EMPTY_15': headerRow['__EMPTY_15'], // Required in desired no of SS
  '__EMPTY_16': headerRow['__EMPTY_16'] // Starting Inventory Mar25
};

console.log('='.repeat(100));
console.log('COLUMN MAPPING');
console.log('='.repeat(100));
Object.entries(columnMapping).forEach(([key, value]) => {
  console.log(`${key.padEnd(60)} => ${value}`);
});

// Skip first 2 rows (header + blank) and process actual data
const items = rawData.slice(2)
  .filter(row => row['__EMPTY'] && row['__EMPTY'].toString().trim()) // Has Sl No
  .map(row => ({
    sl_no: row['__EMPTY'],
    unit_of_measure: row['165'],
    is_lifebuoy: row['__EMPTY_1'] === 'A',
    responsible_person: row['__EMPTY_2'],
    threshold_stock: parseFloat(row['__EMPTY_3']) || 0,
    hsn_code: row['__EMPTY_6'],
    raw_material_name: row['Colum O to T should only Be Copied for Purchase Order'],
    sas_part_number: row['__EMPTY_7'],
    oem_part_number: row['__EMPTY_8'],
    cost: cleanPrice(row['__EMPTY_10']),
    gst_rate: parseFloat(row['__EMPTY_11']) || 0,
    total_stock_in: parseFloat(row['__EMPTY_12']) || 0,
    required_for_single_saifseas: parseFloat(row['__EMPTY_13']) || 0,
    order_status: row['Desired Production: ->'],
    supplier: row['__EMPTY_14'],
    starting_inventory_mar25: parseFloat(row['__EMPTY_16']) || 0
  }));

console.log('\n' + '='.repeat(100));
console.log('PROCESSED ITEMS');
console.log('='.repeat(100));
console.log(`Total items processed: ${items.length}\n`);

// Show first 5 items
items.slice(0, 5).forEach((item, index) => {
  console.log(`\n--- ITEM ${index + 1} ---`);
  console.log(`Sl No: ${item.sl_no}`);
  console.log(`Name: ${item.raw_material_name}`);
  console.log(`SAS Part Number: ${item.sas_part_number}`);
  console.log(`OEM Part Number: ${item.oem_part_number}`);
  console.log(`HSN Code: ${item.hsn_code}`);
  console.log(`GST Rate: ${item.gst_rate}%`);
  console.log(`Cost: ₹${item.cost}`);
  console.log(`Supplier: ${item.supplier}`);
  console.log(`Threshold Stock: ${item.threshold_stock}`);
  console.log(`Unit: ${item.unit_of_measure}`);
  console.log(`Current Stock: ${item.total_stock_in}`);
  console.log(`Responsible: ${item.responsible_person}`);
});

// Analyze SAS Part Number patterns
console.log('\n' + '='.repeat(100));
console.log('SAS PART NUMBER PATTERN ANALYSIS');
console.log('='.repeat(100));

const sasPatterns = items
  .filter(item => item.sas_part_number)
  .slice(0, 30);

sasPatterns.forEach((item, i) => {
  console.log(`${String(i + 1).padStart(3)}. ${item.sas_part_number.padEnd(30)} | ${item.oem_part_number.substring(0, 25).padEnd(25)} | ${item.raw_material_name.substring(0, 40)}`);
});

// Detect pattern logic
console.log('\n🔍 PATTERN DETECTION:');
const prefixes = {};
const structures = {};

sasPatterns.forEach(item => {
  const pn = item.sas_part_number;
  
  // Extract prefix (letters before first dash or digit)
  const prefixMatch = pn.match(/^([A-Z]+)/);
  if (prefixMatch) {
    const prefix = prefixMatch[1];
    prefixes[prefix] = (prefixes[prefix] || 0) + 1;
  }
  
  // Analyze structure
  if (pn.includes('-')) {
    const parts = pn.split('-');
    const structure = parts.map((p, i) => {
      if (/^[A-Z]+$/.test(p)) return 'ALPHA';
      if (/^\d+$/.test(p)) return 'NUM';
      if (/^[A-Z]+\d+$/.test(p)) return 'ALPHANUM';
      return 'MIXED';
    }).join('-');
    structures[structure] = (structures[structure] || 0) + 1;
  }
});

console.log('\nPREFIXES FOUND:');
Object.entries(prefixes)
  .sort((a, b) => b[1] - a[1])
  .forEach(([prefix, count]) => {
    console.log(`  ${prefix.padEnd(10)} : ${count} items`);
  });

console.log('\nSTRUCTURES FOUND:');
Object.entries(structures)
  .sort((a, b) => b[1] - a[1])
  .forEach(([structure, count]) => {
    console.log(`  ${structure.padEnd(30)} : ${count} items`);
  });

// Data quality report
console.log('\n' + '='.repeat(100));
console.log('DATA QUALITY REPORT');
console.log('='.repeat(100));

console.log(`Total items: ${items.length}`);
console.log(`With SAS Part Number: ${items.filter(i => i.sas_part_number).length}`);
console.log(`With OEM Part Number: ${items.filter(i => i.oem_part_number).length}`);
console.log(`With HSN Code: ${items.filter(i => i.hsn_code).length}`);
console.log(`With GST Rate: ${items.filter(i => i.gst_rate > 0).length}`);
console.log(`With Cost: ${items.filter(i => i.cost > 0).length}`);
console.log(`With Supplier: ${items.filter(i => i.supplier).length}`);
console.log(`With Threshold Stock: ${items.filter(i => i.threshold_stock > 0).length}`);
console.log(`With Unit: ${items.filter(i => i.unit_of_measure).length}`);

// Unique suppliers
const suppliers = [...new Set(items.map(i => i.supplier).filter(s => s))];
console.log(`\nUnique Suppliers: ${suppliers.length}`);
suppliers.slice(0, 10).forEach(s => console.log(`  - ${s}`));

// Save processed data
console.log('\n' + '='.repeat(100));
console.log('SAVING FILES');
console.log('='.repeat(100));

fs.writeFileSync('master-items-processed.json', JSON.stringify(items, null, 2));
console.log(`✅ Saved ${items.length} processed items to master-items-processed.json`);

// Generate import mapping
const importMapping = {
  totalItems: items.length,
  columnMapping: columnMapping,
  databaseMapping: {
    'part_number': 'sas_part_number',
    'name': 'raw_material_name',
    'description': 'raw_material_name',
    'type': 'RAW_MATERIAL',
    'category': 'Based on prefix or manual classification',
    'hsn_code': 'hsn_code',
    'gst_rate': 'gst_rate',
    'unit': 'unit_of_measure',
    'min_stock_level': 'threshold_stock',
    'reorder_level': 'threshold_stock',
    'manufacturer_part_number': 'oem_part_number',
    'cost_price': 'cost',
    'supplier_name': 'supplier'
  },
  sasPartNumberLogic: {
    prefixes: prefixes,
    structures: structures,
    examples: sasPatterns.slice(0, 10).map(i => ({
      sas: i.sas_part_number,
      oem: i.oem_part_number,
      name: i.raw_material_name
    }))
  },
  suppliers: suppliers
};

fs.writeFileSync('import-mapping.json', JSON.stringify(importMapping, null, 2));
console.log(`✅ Saved import mapping to import-mapping.json`);

console.log('\n' + '='.repeat(100));
console.log('✅ ANALYSIS COMPLETE - Ready for import!');
console.log('='.repeat(100));

function cleanPrice(priceStr) {
  if (!priceStr) return 0;
  // Remove currency symbols, commas, and spaces
  const cleaned = priceStr.toString()
    .replace(/[₹$,\s]/g, '')
    .replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}
