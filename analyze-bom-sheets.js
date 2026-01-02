const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('3. Master List of Raw Material Saif Automations (1).xlsx');

console.log('='.repeat(80));
console.log('BOM SHEETS ANALYSIS');
console.log('='.repeat(80));

// Analyze BOM-related sheets
const bomSheets = ['S-BOM', 'A-BOM', 'FG', 'S-FG', 'IssueBOM', 'MRP'];

bomSheets.forEach(sheetName => {
  if (!workbook.SheetNames.includes(sheetName)) {
    console.log(`\n⚠️  Sheet ${sheetName} not found`);
    return;
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 SHEET: ${sheetName}`);
  console.log('='.repeat(80));
  
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
  
  console.log(`Total rows: ${data.length}`);
  
  if (data.length > 0) {
    console.log('\nColumn Headers:');
    Object.keys(data[0]).forEach((header, i) => {
      console.log(`  ${i + 1}. ${header}`);
    });
    
    console.log('\nFirst 5 rows:');
    data.slice(0, 5).forEach((row, i) => {
      console.log(`\n--- Row ${i + 1} ---`);
      Object.entries(row).forEach(([key, value]) => {
        if (value && value.toString().trim()) {
          console.log(`  ${key}: ${value.toString().substring(0, 60)}`);
        }
      });
    });
  }
});

// Save raw data
console.log('\n' + '='.repeat(80));
console.log('SAVING RAW BOM DATA');
console.log('='.repeat(80));

bomSheets.forEach(sheetName => {
  if (workbook.SheetNames.includes(sheetName)) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
    fs.writeFileSync(`bom-${sheetName.toLowerCase()}.json`, JSON.stringify(data, null, 2));
    console.log(`✅ Saved bom-${sheetName.toLowerCase()}.json (${data.length} rows)`);
  }
});
