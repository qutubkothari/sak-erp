const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const workbook = XLSX.readFile('3. Master List of Raw Material Saif Automations (1).xlsx');

// Find the Master List sheet
const masterSheetName = workbook.SheetNames.find(name => 
  name.toLowerCase().includes('master') || 
  name.toLowerCase().includes('raw material') ||
  name === 'Sheet1' ||
  name === 'Master List'
);

if (!masterSheetName) {
  console.log('Available sheets:', workbook.SheetNames);
  console.error('Could not find Master List sheet');
  process.exit(1);
}

console.log(`📋 Analyzing Sheet: ${masterSheetName}\n`);

const worksheet = workbook.Sheets[masterSheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

console.log(`Total Items: ${jsonData.length}\n`);

if (jsonData.length > 0) {
  console.log('='.repeat(100));
  console.log('COLUMN STRUCTURE');
  console.log('='.repeat(100));
  
  const headers = Object.keys(jsonData[0]);
  headers.forEach((header, index) => {
    console.log(`${index + 1}. ${header}`);
  });
  
  console.log('\n' + '='.repeat(100));
  console.log('SAMPLE ITEMS (First 5)');
  console.log('='.repeat(100));
  
  jsonData.slice(0, 5).forEach((item, index) => {
    console.log(`\n--- ITEM ${index + 1} ---`);
    Object.entries(item).forEach(([key, value]) => {
      if (value && value.toString().trim()) {
        console.log(`  ${key}: ${value}`);
      }
    });
  });
  
  // Analyze part number patterns
  console.log('\n' + '='.repeat(100));
  console.log('PART NUMBER PATTERN ANALYSIS');
  console.log('='.repeat(100));
  
  const partNumberKeys = headers.filter(h => 
    h.toLowerCase().includes('part') || 
    h.toLowerCase().includes('sas') ||
    h.toLowerCase().includes('number')
  );
  
  if (partNumberKeys.length > 0) {
    partNumberKeys.forEach(key => {
      console.log(`\n📋 Field: ${key}`);
      const samples = jsonData
        .slice(0, 20)
        .map(row => row[key])
        .filter(val => val && val.toString().trim());
      
      console.log(`Sample values:`);
      samples.forEach((val, i) => {
        console.log(`  ${i + 1}. ${val}`);
      });
      
      // Try to detect pattern
      if (samples.length > 0) {
        const pattern = detectPattern(samples);
        if (pattern) {
          console.log(`\n🔍 Detected Pattern: ${pattern}`);
        }
      }
    });
  }
  
  // Save to JSON for import
  console.log('\n' + '='.repeat(100));
  console.log('SAVING DATA');
  console.log('='.repeat(100));
  
  fs.writeFileSync('master-items-raw.json', JSON.stringify(jsonData, null, 2));
  console.log(`✅ Saved ${jsonData.length} items to master-items-raw.json`);
  
  // Create summary
  const summary = {
    totalItems: jsonData.length,
    columns: headers,
    hasHSN: headers.some(h => h.toLowerCase().includes('hsn')),
    hasGST: headers.some(h => h.toLowerCase().includes('gst')),
    hasPrice: headers.some(h => h.toLowerCase().includes('price') || h.toLowerCase().includes('cost')),
    hasSupplier: headers.some(h => h.toLowerCase().includes('supplier') || h.toLowerCase().includes('vendor')),
    hasMinStock: headers.some(h => h.toLowerCase().includes('min') || h.toLowerCase().includes('threshold')),
    hasPartNumber: headers.some(h => h.toLowerCase().includes('part') && h.toLowerCase().includes('number')),
    sampleItem: jsonData[0]
  };
  
  fs.writeFileSync('master-items-summary.json', JSON.stringify(summary, null, 2));
  console.log(`✅ Saved summary to master-items-summary.json`);
}

function detectPattern(samples) {
  // Analyze common patterns in part numbers
  const patterns = [];
  
  samples.forEach(sample => {
    const str = sample.toString();
    
    // Check for prefixes
    const prefix = str.match(/^[A-Z]+/);
    if (prefix) patterns.push(`PREFIX: ${prefix[0]}`);
    
    // Check for numbers
    const numbers = str.match(/\d+/g);
    if (numbers) patterns.push(`NUMBERS: ${numbers.length} group(s)`);
    
    // Check for separators
    if (str.includes('-')) patterns.push('SEPARATOR: -');
    if (str.includes('_')) patterns.push('SEPARATOR: _');
    if (str.includes('/')) patterns.push('SEPARATOR: /');
  });
  
  // Find most common pattern
  const freq = {};
  patterns.forEach(p => freq[p] = (freq[p] || 0) + 1);
  
  const commonPatterns = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pattern]) => pattern);
  
  return commonPatterns.join(', ');
}
