/**
 * Updated Vendor Export with all fields from Format for Vendor Creation.xlsx
 * Run: node export-vendors-updated.js
 */

const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportVendors() {
  console.log('\n📊 Fetching vendors...');
  
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`✅ Found ${vendors?.length || 0} vendors`);
  if (!vendors || vendors.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Vendors');

  // Headers matching Format for Vendor Creation.xlsx
  const headers = [
    // A. General Information
    'ID', 'Company Code', 'Company Name', 'Legal Name', 'Address', 'City', 'State', 'Country', 'Pincode',
    // B. Contact Information
    'Telephone Number', 'Email',
    // C. Statutory Information
    'Type of Company', 'GST Number', 'PAN Number', 'MSME/Udhyam Type', 'MSME/Udhyam Number',
    // D. Contact Details
    'Contact Person Name', 'Mobile',
    // E. Bank Details
    'Name in Bank', 'Bank Account No', 'Bank Name', 'Bank Address', 'Bank Branch Code', 'Swift Code',
    // System Fields
    'Is Verified', 'Is Active', 'Payment Terms', 'Credit Limit', 'Created At', 'Updated At'
  ];
  
  worksheet.addRow(headers);
  
  vendors.forEach((v) => {
    worksheet.addRow([
      // A. General Information
      v.id,
      v.code,
      v.name,
      v.legal_name,
      v.address || v.street || '',
      v.city || '',
      v.state || '',
      v.country || '',
      v.pincode || '',
      // B. Contact Information
      v.phone || '',
      v.email || '',
      // C. Statutory Information
      v.company_type || '',
      v.gst_number || '',
      v.pan_number || '',
      v.msme_type || '',
      v.msme_number || '',
      // D. Contact Details
      v.contact_person || '',
      v.phone || '', // Mobile same as phone for now
      // E. Bank Details
      v.bank_account_name || '',
      v.bank_account_number || '',
      v.bank_name || '',
      v.bank_address || '',
      v.bank_branch_code || '',
      v.swift_code || '',
      // System Fields
      v.is_verified ? 'Yes' : 'No',
      v.is_active ? 'Yes' : 'No',
      v.payment_terms || '',
      v.credit_limit || '',
      v.created_at,
      v.updated_at
    ]);
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  
  // Set column widths
  const widths = [36, 15, 30, 30, 40, 15, 15, 15, 10, 15, 25, 20, 20, 20, 15, 20, 25, 15, 25, 20, 25, 40, 15, 15, 12, 12, 15, 15, 20, 20];
  headers.forEach((_, i) => {
    worksheet.getColumn(i + 1).width = widths[i] || 15;
  });

  // Add section header comments/rows (after data)
  const outputPath = path.join(__dirname, 'vendors-updated-format.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Saved: ${outputPath}`);
  console.log(`\n📋 Fields included (matching Format for Vendor Creation.xlsx):`);
  console.log('  A. General Information: Name, Address, City, State, Country, Pincode');
  console.log('  B. Contact Information: Telephone, Email');
  console.log('  C. Statutory Information: Company Type, GST, PAN, MSME Type/Number');
  console.log('  D. Contact Details: Contact Person, Mobile');
  console.log('  E. Bank Details: Account Name, Number, Bank Name, Address, Branch Code, Swift Code');
}

async function main() {
  console.log('🚀 Starting vendor export with updated format...');
  try {
    await exportVendors();
    console.log('\n✨ Done!');
    console.log('\n⚠️  NOTE: Run RUN-IN-SUPABASE-SQL-EDITOR.sql in Supabase SQL Editor first');
    console.log('   to add the missing fields (GST, PAN, MSME, Bank Details) to the database.');
  } catch (err) {
    console.error('\n❌ Failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
