const ExcelJS = require('exceljs');

async function readVendorFormat() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('./Format for Vendor Creation.xlsx');
  
  const worksheet = workbook.worksheets[0];
  console.log('Sheet name:', worksheet.name);
  console.log('Row count:', worksheet.rowCount);
  console.log('Column count:', worksheet.columnCount);
  
  // Get headers from first row
  const headers = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers.push({ col: colNumber, header: cell.value });
  });
  console.log('\nHeaders:');
  headers.forEach(h => console.log(`  ${h.col}. ${h.header}`));
  
  // Show first 50 rows to understand structure
  console.log('\nFirst 50 rows (structure analysis):');
  for (let i = 2; i <= Math.min(50, worksheet.rowCount); i++) {
    const row = worksheet.getRow(i);
    const col1 = row.getCell(1).value;
    const col2 = row.getCell(2).value;
    const col3 = row.getCell(3).value;
    
    // Only show rows that have data
    if (col1 || col2 || col3) {
      console.log(`Row ${i}: Col1=${col1}, Col2=${col2}, Col3=${col3}`);
    }
  }
}

readVendorFormat().catch(err => console.error('Error:', err.message));
