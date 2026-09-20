const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const workbook = XLSX.readFile('3. Master List of Raw Material Saif Automations (1).xlsx');

console.log('📋 Analyzing Sheet: RM (Raw Material Master List)\n');

const worksheet = workbook.Sheets['RM'];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

console.log(`Total Items: ${jsonData.length}\n`);

if (jsonData.length > 0) {
  console.log('='.repeat(100));
  console.log('COLUMN STRUCTURE');
  console.log('='.repeat(100));
  
  const headers = Object.keys(jsonData[0]);
  headers.forEach((header, index) => {
    console.log(`${String(index + 1).padStart(2, ' ')}. ${header}`);
  });
  
  console.log('\n' + '='.repeat(100));
  console.log('FIRST 3 COMPLETE ITEMS');
  console.log('='.repeat(100));
  
  jsonData.slice(0, 3).forEach((item, index) => {
    console.log(`\n${'▼'.repeat(50)} ITEM ${index + 1} ${'▼'.repeat(50)}`);
    Object.entries(item).forEach(([key, value]) => {
      const displayValue = value && value.toString().trim() ? value : '(empty)';
      console.log(`  ${key.padEnd(40, ' ')} : ${displayValue}`);
    });
  });
  
  // Analyze part number patterns
  console.log('\n' + '='.repeat(100));
  console.log('PART NUMBER LOGIC ANALYSIS');
  console.log('='.repeat(100));
  
  const sasPartNumbers = jsonData
    .slice(0, 30)
    .map(row => ({
      sas: row['SAS Part Number'] || row['Part Number'] || '',
      original: row['Original Part Number'] || row['Manufacturer Part Number'] || '',
      name: row['Item Name'] || row['Description'] || row['Name'] || ''
    }))
    .filter(item => item.sas);
  
  console.log('\n📋 PART NUMBER SAMPLES (First 15):');
  sasPartNumbers.slice(0, 15).forEach((item, i) => {
    console.log(`${String(i + 1).padStart(2, ' ')}. SAS: ${item.sas.padEnd(25)} | Original: ${item.original.substring(0, 30).padEnd(30)} | Name: ${item.name.substring(0, 40)}`);
  });
  
  // Detect pattern
  console.log('\n🔍 PATTERN DETECTION:');
  const patterns = analyzeSASPartNumbers(sasPartNumbers.map(i => i.sas));
  console.log(patterns);
  
  // Check for important fields
  console.log('\n' + '='.repeat(100));
  console.log('FIELD AVAILABILITY CHECK');
  console.log('='.repeat(100));
  
  const fieldCheck = {
    'HSN Code': headers.find(h => h.toLowerCase().includes('hsn')),
    'GST Rate': headers.find(h => h.toLowerCase().includes('gst')),
    'Price/Cost': headers.find(h => h.toLowerCase().includes('price') || h.toLowerCase().includes('cost') || h.toLowerCase().includes('rate')),
    'Supplier': headers.find(h => h.toLowerCase().includes('supplier') || h.toLowerCase().includes('vendor')),
    'Min Stock': headers.find(h => h.toLowerCase().includes('min') || h.toLowerCase().includes('threshold') || h.toLowerCase().includes('reorder')),
    'SAS Part Number': headers.find(h => h.toLowerCase().includes('sas') && h.toLowerCase().includes('part')),
    'Original Part Number': headers.find(h => h.toLowerCase().includes('original') || h.toLowerCase().includes('manufacturer')),
    'Unit': headers.find(h => h.toLowerCase().includes('unit') || h.toLowerCase().includes('uom')),
    'Description/Name': headers.find(h => h.toLowerCase().includes('description') || h.toLowerCase().includes('name') || h.toLowerCase().includes('item'))
  };
  
  Object.entries(fieldCheck).forEach(([field, columnName]) => {
    const status = columnName ? '✅' : '❌';
    console.log(`${status} ${field.padEnd(25)} : ${columnName || 'NOT FOUND'}`);
  });
  
  // Count items with data
  console.log('\n' + '='.repeat(100));
  console.log('DATA QUALITY CHECK');
  console.log('='.repeat(100));
  
  const hsnField = fieldCheck['HSN Code'];
  const gstField = fieldCheck['GST Rate'];
  const priceField = fieldCheck['Price/Cost'];
  const supplierField = fieldCheck['Supplier'];
  const minStockField = fieldCheck['Min Stock'];
  
  console.log(`Total items: ${jsonData.length}`);
  if (hsnField) console.log(`Items with HSN: ${jsonData.filter(r => r[hsnField]).length}`);
  if (gstField) console.log(`Items with GST: ${jsonData.filter(r => r[gstField]).length}`);
  if (priceField) console.log(`Items with Price: ${jsonData.filter(r => r[priceField]).length}`);
  if (supplierField) console.log(`Items with Supplier: ${jsonData.filter(r => r[supplierField]).length}`);
  if (minStockField) console.log(`Items with Min Stock: ${jsonData.filter(r => r[minStockField]).length}`);
  
  // Save files
  console.log('\n' + '='.repeat(100));
  console.log('SAVING DATA FILES');
  console.log('='.repeat(100));
  
  fs.writeFileSync('master-items-raw.json', JSON.stringify(jsonData, null, 2));
  console.log(`✅ Saved ${jsonData.length} items to master-items-raw.json`);
  
  const summary = {
    totalItems: jsonData.length,
    columns: headers,
    fieldMapping: fieldCheck,
    sampleItems: jsonData.slice(0, 3)
  };
  
  fs.writeFileSync('master-items-summary.json', JSON.stringify(summary, null, 2));
  console.log(`✅ Saved summary to master-items-summary.json`);
}

function analyzeSASPartNumbers(partNumbers) {
  const analysis = {
    total: partNumbers.length,
    samples: partNumbers.slice(0, 10),
    patterns: {}
  };
  
  partNumbers.forEach(pn => {
    // Check structure
    if (pn.match(/^[A-Z]{2,4}-/)) analysis.patterns['PREFIX-DASH'] = (analysis.patterns['PREFIX-DASH'] || 0) + 1;
    if (pn.match(/\d{3,}/)) analysis.patterns['NUMERIC_SEQUENCE'] = (analysis.patterns['NUMERIC_SEQUENCE'] || 0) + 1;
    if (pn.match(/[A-Z]+\d+/)) analysis.patterns['ALPHA_NUMERIC'] = (analysis.patterns['ALPHA_NUMERIC'] || 0) + 1;
    if (pn.includes('-')) analysis.patterns['USES_DASH'] = (analysis.patterns['USES_DASH'] || 0) + 1;
    if (pn.includes('/')) analysis.patterns['USES_SLASH'] = (analysis.patterns['USES_SLASH'] || 0) + 1;
  });
  
  return JSON.stringify(analysis, null, 2);
}
