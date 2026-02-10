const xlsx = require('xlsx');

console.log('\n=== Validating BOM-LIST.xlsx Data Structure ===\n');

const wb = xlsx.readFile('BOM-LIST.xlsx');
const sheet = wb.Sheets['RM'];

// Read with header: 1 to see raw data
const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log(`Total rows in RM sheet: ${rawData.length}\n`);

// Find the actual header row
console.log('First 10 rows to identify header:\n');
for (let i = 0; i < Math.min(10, rawData.length); i++) {
  console.log(`Row ${i + 1}:`, rawData[i].slice(0, 8));
}

// Look for "RAW MATERIAL NAME" column
let headerRowIndex = -1;
let materialNameColIndex = -1;

for (let i = 0; i < rawData.length; i++) {
  for (let j = 0; j < rawData[i].length; j++) {
    const cell = String(rawData[i][j] || '').trim();
    if (cell === 'RAW MATERIAL NAME') {
      headerRowIndex = i;
      materialNameColIndex = j;
      break;
    }
  }
  if (headerRowIndex !== -1) break;
}

if (headerRowIndex === -1) {
  console.error('\n❌ ERROR: Could not find "RAW MATERIAL NAME" column header!');
  console.log('\nSearching for any row containing partial matches...');
  
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const rowStr = rawData[i].join('|');
    if (rowStr.toUpperCase().includes('MATERIAL') || rowStr.toUpperCase().includes('SUPPLIER')) {
      console.log(`\nPossible header at row ${i + 1}:`, rawData[i]);
    }
  }
  process.exit(1);
}

console.log(`\n✅ Found header row at row ${headerRowIndex + 1}`);
console.log(`✅ "RAW MATERIAL NAME" is in column ${materialNameColIndex + 1}\n`);

const headers = rawData[headerRowIndex];
console.log('Header columns:');
headers.forEach((h, idx) => {
  if (h) console.log(`  Column ${idx + 1}: "${h}"`);
});

// Validate critical columns exist
const requiredColumns = ['RAW MATERIAL NAME', 'SAS Part Number', 'SUPPLIER', 'UNIT OF MEASURE'];
const missingColumns = [];

requiredColumns.forEach(col => {
  if (!headers.includes(col)) {
    missingColumns.push(col);
  }
});

if (missingColumns.length > 0) {
  console.error(`\n❌ ERROR: Missing required columns: ${missingColumns.join(', ')}`);
  process.exit(1);
}

console.log('\n✅ All required columns found\n');

// Now parse the actual data
const dataRows = rawData.slice(headerRowIndex + 1);
const items = dataRows.map((row, idx) => {
  const obj = { _rowNumber: headerRowIndex + idx + 2 }; // +2 for 1-based and header skip
  headers.forEach((header, colIdx) => {
    if (header) obj[header] = row[colIdx] || '';
  });
  return obj;
}).filter(item => {
  const name = String(item['RAW MATERIAL NAME'] || '').trim();
  return name && name !== 'RAW MATERIAL NAME'; // Skip empty and duplicate headers
});

console.log(`Found ${items.length} valid items after filtering\n`);

// Validate sample data
console.log('=== Validating first 5 items ===\n');
const errors = [];

items.slice(0, 5).forEach((item, idx) => {
  console.log(`Item ${idx + 1} (Row ${item._rowNumber}):`);
  console.log(`  Name: ${item['RAW MATERIAL NAME']}`);
  console.log(`  Part #: ${item['SAS Part Number'] || 'MISSING'}`);
  console.log(`  Supplier: ${item['SUPPLIER'] || 'MISSING'}`);
  console.log(`  UOM: ${item['UNIT OF MEASURE'] || 'MISSING'}`);
  
  if (!item['RAW MATERIAL NAME']) {
    errors.push(`Row ${item._rowNumber}: Missing item name`);
  }
  if (!item['SUPPLIER']) {
    errors.push(`Row ${item._rowNumber}: Missing supplier for ${item['RAW MATERIAL NAME']}`);
  }
  console.log('');
});

// Count IN HOUSE items
const inHouseItems = items.filter(item => {
  const supplier = String(item['SUPPLIER'] || '').toUpperCase();
  return supplier.includes('IN HOUSE') || supplier.includes('INHOUSE');
});

console.log(`\n=== Statistics ===`);
console.log(`Total items: ${items.length}`);
console.log(`IN HOUSE (sub-assemblies): ${inHouseItems.length}`);
console.log(`External supplier items: ${items.length - inHouseItems.length}`);

// Check for duplicate part numbers
const partNumbers = new Map();
items.forEach(item => {
  const partNum = String(item['SAS Part Number'] || '').trim();
  if (partNum) {
    if (!partNumbers.has(partNum)) {
      partNumbers.set(partNum, []);
    }
    partNumbers.get(partNum).push(item['RAW MATERIAL NAME']);
  }
});

const duplicates = Array.from(partNumbers.entries()).filter(([_, names]) => names.length > 1);
if (duplicates.length > 0) {
  console.log(`\n⚠️  Found ${duplicates.length} duplicate part numbers:`);
  duplicates.slice(0, 5).forEach(([partNum, names]) => {
    console.log(`  ${partNum}: ${names.join(', ')}`);
  });
}

// List unique suppliers
const suppliers = new Set();
items.forEach(item => {
  const supplier = String(item['SUPPLIER'] || '').trim();
  if (supplier) suppliers.add(supplier);
});

console.log(`\n=== Unique Suppliers (${suppliers.size}) ===`);
Array.from(suppliers).sort().slice(0, 20).forEach(s => console.log(`  - ${s}`));
if (suppliers.size > 20) {
  console.log(`  ... and ${suppliers.size - 20} more`);
}

if (errors.length > 0) {
  console.log('\n❌ Validation errors found:');
  errors.forEach(e => console.log(`  - ${e}`));
  process.exit(1);
}

console.log('\n✅ Data structure validation passed!');
console.log('\nReady to import.');
