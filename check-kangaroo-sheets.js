/**
 * Check BOM-LIST.xlsx for sheets with "Kangaroo" in the name
 */

const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'BOM-LIST.xlsx');

try {
  const workbook = xlsx.readFile(filePath);
  
  console.log('\n============================================================');
  console.log('SHEETS WITH "KANGAROO" IN NAME');
  console.log('============================================================\n');
  
  const kangarooSheets = workbook.SheetNames.filter(name => 
    name.toLowerCase().includes('kangaroo')
  );
  
  console.log(`Found ${kangarooSheets.length} sheets:\n`);
  
  kangarooSheets.forEach((sheetName, idx) => {
    console.log(`${idx + 1}. "${sheetName}"`);
    
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Try to find the parent item info (usually in first few rows)
    console.log('   First 5 rows:');
    data.slice(0, 5).forEach((row, rowIdx) => {
      if (row && row.length > 0) {
        const rowStr = row.map(cell => String(cell || '')).filter(Boolean).join(' | ');
        if (rowStr.trim()) {
          console.log(`     Row ${rowIdx + 1}: ${rowStr}`);
        }
      }
    });
    
    console.log('');
  });
  
  console.log('============================================================\n');
  
} catch (err) {
  console.error('Error reading BOM-LIST.xlsx:', err.message);
}
