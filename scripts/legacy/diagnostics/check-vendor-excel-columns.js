const xlsx = require('xlsx');

console.log('\n=== Checking VENDORS.xlsx columns ===\n');

const wb = xlsx.readFile('VENDORS.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

console.log(`Sheet name: ${wb.SheetNames[0]}`);
console.log(`Total rows: ${data.length}\n`);

if (data.length > 0) {
  console.log('Columns in Excel file:');
  Object.keys(data[0]).forEach((col, idx) => {
    console.log(`  ${idx + 1}. "${col}"`);
  });

  console.log('\n=== Sample vendor data (first 3 rows) ===\n');
  data.slice(0, 3).forEach((row, idx) => {
    console.log(`\n--- Vendor ${idx + 1}: ${row['Vendor Name'] || 'N/A'} ---`);
    Object.keys(row).forEach(key => {
      let value = row[key];
      if (typeof value === 'string' && value.length > 80) {
        value = value.substring(0, 80) + '...';
      }
      console.log(`  ${key}: ${value}`);
    });
  });
}
