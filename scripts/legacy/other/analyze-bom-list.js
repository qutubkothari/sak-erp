const xlsx = require('xlsx');

console.log('\n=== Analyzing BOM-LIST.xlsx Structure ===\n');

const wb = xlsx.readFile('BOM-LIST.xlsx');

console.log(`Total sheets: ${wb.SheetNames.length}\n`);
console.log('Sheet names:');
wb.SheetNames.forEach((name, idx) => {
  const sheet = wb.Sheets[name];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`  ${idx + 1}. "${name}" - ${data.length} rows`);
});

// Analyze RM sheet (main inventory)
console.log('\n=== RM Sheet Analysis ===\n');
const rmSheet = wb.Sheets['RM'];
if (rmSheet) {
  const rmData = xlsx.utils.sheet_to_json(rmSheet, { defval: '' });
  console.log(`Total items in RM sheet: ${rmData.length}\n`);
  
  if (rmData.length > 0) {
    console.log('Columns in RM sheet:');
    Object.keys(rmData[0]).forEach((col, idx) => {
      console.log(`  ${idx + 1}. "${col}"`);
    });
    
    // Count IN HOUSE items
    const inHouseItems = rmData.filter(r => 
      String(r['Supplier'] || '').toUpperCase().includes('IN HOUSE') ||
      String(r['SUPPLIER'] || '').toUpperCase().includes('IN HOUSE')
    );
    console.log(`\nItems with "IN HOUSE" supplier: ${inHouseItems.length}`);
    
    console.log('\n=== Sample RM Data (first 3 rows) ===\n');
    rmData.slice(0, 3).forEach((row, idx) => {
      console.log(`--- Item ${idx + 1} ---`);
      Object.keys(row).forEach(key => {
        let value = row[key];
        if (typeof value === 'string' && value.length > 80) {
          value = value.substring(0, 80) + '...';
        }
        console.log(`  ${key}: ${value}`);
      });
      console.log('');
    });
  }
} else {
  console.log('RM sheet not found!');
}

// Analyze first sub-assembly sheet
console.log('\n=== Sample Sub-Assembly Sheet Analysis ===\n');
const subAssemblySheets = wb.SheetNames.filter(name => name !== 'RM');
if (subAssemblySheets.length > 0) {
  const firstSubAssy = subAssemblySheets[0];
  console.log(`Analyzing sheet: "${firstSubAssy}"\n`);
  
  const sheet = wb.Sheets[firstSubAssy];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  
  console.log(`Total rows: ${data.length}\n`);
  
  if (data.length > 0) {
    console.log('Columns:');
    Object.keys(data[0]).forEach((col, idx) => {
      console.log(`  ${idx + 1}. "${col}"`);
    });
    
    console.log(`\n=== Sample data (first 2 rows) ===\n`);
    data.slice(0, 2).forEach((row, idx) => {
      console.log(`--- Row ${idx + 1} ---`);
      Object.keys(row).forEach(key => {
        let value = row[key];
        if (typeof value === 'string' && value.length > 60) {
          value = value.substring(0, 60) + '...';
        }
        console.log(`  ${key}: ${value}`);
      });
      console.log('');
    });
  }
}
