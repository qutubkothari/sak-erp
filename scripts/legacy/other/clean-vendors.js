import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import fs from 'fs';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

// Check which Excel file has the vendor list
async function findVendorExcelFile() {
  const possibleFiles = [
    'Kangroo BOM list - Updated list.xlsx',
    'BOM list.xlsx',
    'vendors.xlsx',
    'Vendor List.xlsx'
  ];

  for (const file of possibleFiles) {
    if (fs.existsSync(file)) {
      console.log(`Found vendor file: ${file}`);
      return file;
    }
  }
  
  // Check in current directory for any xlsx files
  const files = fs.readdirSync('.').filter(f => f.endsWith('.xlsx'));
  console.log('\nAvailable Excel files:');
  files.forEach(f => console.log(`  - ${f}`));
  
  return files[0]; // Return first Excel file found
}

async function cleanDuplicatesAndAddMissing() {
  console.log('\n=== STEP 1: IDENTIFY DUPLICATES ===\n');

  const { data: allVendors, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching vendors:', error);
    return;
  }

  // Group by similar names (case-insensitive, trimmed)
  const vendorGroups = {};
  allVendors.forEach(vendor => {
    const normalizedName = vendor.name.trim().toUpperCase();
    if (!vendorGroups[normalizedName]) {
      vendorGroups[normalizedName] = [];
    }
    vendorGroups[normalizedName].push(vendor);
  });

  // Find duplicates
  const duplicates = Object.entries(vendorGroups).filter(([name, vendors]) => vendors.length > 1);

  console.log(`Total unique vendor names: ${Object.keys(vendorGroups).length}`);
  console.log(`Duplicate groups: ${duplicates.length}\n`);

  if (duplicates.length > 0) {
    console.log('=== DUPLICATES FOUND ===\n');
    duplicates.forEach(([name, vendors]) => {
      console.log(`${name} (${vendors.length} entries):`);
      vendors.forEach((v, idx) => {
        const hasEmail = v.email ? '📧' : '  ';
        const hasPhone = v.phone ? '📱' : '  ';
        const hasAddress = v.address ? '🏠' : '  ';
        console.log(`  ${idx + 1}. Code: ${v.code || 'N/A'} ${hasEmail}${hasPhone}${hasAddress}`);
      });
      console.log('');
    });

    console.log('\n=== CLEANING DUPLICATES ===\n');
    console.log('Strategy: Keep the vendor with most complete data, mark others as inactive\n');

    for (const [name, vendors] of duplicates) {
      // Score each vendor based on data completeness
      const scored = vendors.map(v => ({
        vendor: v,
        score: (v.email ? 1 : 0) + (v.phone ? 1 : 0) + (v.address ? 1 : 0) + 
               (v.tax_id ? 1 : 0) + (v.contact_person ? 1 : 0) + 
               (v.legal_name && v.legal_name !== v.name ? 1 : 0)
      }));

      // Sort by score (highest first), then by created_at (oldest first as tie-breaker)
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.vendor.created_at) - new Date(b.vendor.created_at);
      });

      const keepVendor = scored[0].vendor;
      const removeVendors = scored.slice(1).map(s => s.vendor);

      console.log(`${name}:`);
      console.log(`  ✅ KEEP: ${keepVendor.code} (Score: ${scored[0].score})`);
      
      for (const removeVendor of removeVendors) {
        console.log(`  ❌ DEACTIVATE: ${removeVendor.code}`);
        
        // Mark as inactive instead of deleting
        const { error: updateError } = await supabase
          .from('vendors')
          .update({ is_active: false })
          .eq('id', removeVendor.id)
          .eq('tenant_id', tenantId);

        if (updateError) {
          console.log(`     ⚠️  Failed to deactivate: ${updateError.message}`);
        }
      }
      console.log('');
    }
  }

  console.log('\n=== STEP 2: LOAD VENDOR LIST FROM EXCEL ===\n');

  const excelFile = await findVendorExcelFile();
  if (!excelFile) {
    console.log('No Excel file found with vendor list.');
    console.log('Please specify the Excel file name.');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelFile);
  
  // Find the Vendors sheet
  let vendorSheet = workbook.getWorksheet('Vendors') || 
                    workbook.getWorksheet('VENDORS') ||
                    workbook.getWorksheet('Vendor List') ||
                    workbook.worksheets[0]; // Use first sheet if no "Vendors" sheet

  console.log(`Reading from sheet: "${vendorSheet.name}"`);

  const excelVendors = [];
  let headerRow = null;

  vendorSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      headerRow = row.values;
      console.log('Headers:', headerRow);
      return;
    }

    const vendorName = row.getCell(1).value?.toString().trim();
    if (!vendorName) return;

    excelVendors.push({
      name: vendorName,
      code: row.getCell(2)?.value?.toString().trim() || null,
      email: row.getCell(8)?.value?.toString().trim() || null,
      phone: row.getCell(9)?.value?.toString().trim() || null,
      address: row.getCell(13)?.value?.toString().trim() || null,
      tax_id: row.getCell(5)?.value?.toString().trim() || null,
      legal_name: row.getCell(4)?.value?.toString().trim() || vendorName,
      category: row.getCell(6)?.value?.toString().trim() || null,
      contact_person: row.getCell(7)?.value?.toString().trim() || null
    });
  });

  console.log(`Found ${excelVendors.length} vendors in Excel\n`);

  console.log('\n=== STEP 3: COMPARE AND ADD MISSING VENDORS ===\n');

  // Get active vendors only
  const { data: activeVendors } = await supabase
    .from('vendors')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  const activeVendorNames = new Set(activeVendors.map(v => v.name.trim().toUpperCase()));

  const missingVendors = excelVendors.filter(ev => 
    !activeVendorNames.has(ev.name.toUpperCase())
  );

  console.log(`Missing vendors to add: ${missingVendors.length}\n`);

  if (missingVendors.length > 0) {
    console.log('=== ADDING MISSING VENDORS ===\n');
    
    for (const vendor of missingVendors) {
      console.log(`Adding: ${vendor.name} (${vendor.code || 'No Code'})`);
      
      const { error: insertError } = await supabase
        .from('vendors')
        .insert({
          tenant_id: tenantId,
          name: vendor.name,
          code: vendor.code,
          legal_name: vendor.legal_name || vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          address: vendor.address,
          tax_id: vendor.tax_id,
          category: vendor.category,
          contact_person: vendor.contact_person,
          is_active: true
        });

      if (insertError) {
        console.log(`  ❌ Failed: ${insertError.message}`);
      } else {
        console.log(`  ✅ Added successfully`);
      }
    }
  }

  console.log('\n=== SUMMARY ===\n');
  console.log(`Duplicate groups cleaned: ${duplicates.length}`);
  console.log(`Missing vendors added: ${missingVendors.length}`);
  
  // Final count
  const { data: finalVendors } = await supabase
    .from('vendors')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  console.log(`\nFinal active vendor count: ${finalVendors.length}`);
}

cleanDuplicatesAndAddMissing().catch(console.error);
