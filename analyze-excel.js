const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const workbook = XLSX.readFile('3. Master List of Raw Material Saif Automations (1).xlsx');

console.log('='.repeat(80));
console.log('EXCEL FILE ANALYSIS');
console.log('='.repeat(80));

console.log('\n📋 SHEET NAMES:');
workbook.SheetNames.forEach((sheetName, index) => {
  console.log(`  ${index + 1}. ${sheetName}`);
});

// Analyze each sheet
workbook.SheetNames.forEach((sheetName) => {
  console.log('\n' + '='.repeat(80));
  console.log(`📄 SHEET: ${sheetName}`);
  console.log('='.repeat(80));
  
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  console.log(`\n📊 Total Rows: ${jsonData.length}`);
  
  if (jsonData.length > 0) {
    console.log('\n📋 COLUMN HEADERS:');
    const headers = Object.keys(jsonData[0]);
    headers.forEach((header, index) => {
      console.log(`  ${index + 1}. ${header}`);
    });
    
    console.log('\n📝 SAMPLE DATA (First 3 rows):');
    jsonData.slice(0, 3).forEach((row, index) => {
      console.log(`\n  --- Row ${index + 1} ---`);
      Object.entries(row).forEach(([key, value]) => {
        const displayValue = String(value).length > 60 
          ? String(value).substring(0, 60) + '...' 
          : value;
        console.log(`  ${key}: ${displayValue}`);
      });
    });
    
    // Analyze data patterns
    console.log('\n📊 DATA PATTERNS:');
    headers.forEach(header => {
      const sampleValues = jsonData.slice(0, 10)
        .map(row => row[header])
        .filter(val => val !== '' && val !== null && val !== undefined);
      
      if (sampleValues.length > 0) {
        const uniqueCount = new Set(sampleValues).size;
        const hasNumbers = sampleValues.some(val => !isNaN(val) && val !== '');
        const hasText = sampleValues.some(val => isNaN(val) || val === '');
        
        console.log(`  ${header}:`);
        console.log(`    - Has data: ${sampleValues.length}/${Math.min(10, jsonData.length)} rows`);
        console.log(`    - Unique values: ${uniqueCount}`);
        console.log(`    - Type: ${hasNumbers && !hasText ? 'Numeric' : hasText ? 'Text/Mixed' : 'Empty'}`);
        console.log(`    - Sample: ${sampleValues.slice(0, 3).join(', ')}`);
      }
    });
  } else {
    console.log('  ⚠️  Sheet is empty');
  }
});

console.log('\n' + '='.repeat(80));
console.log('✅ ANALYSIS COMPLETE');
console.log('='.repeat(80));
