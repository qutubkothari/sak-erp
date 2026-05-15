/**
 * Inline Excel Export Script
 * Run: node export-excel-inline.js
 */

const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('URL:', supabaseUrl ? 'Set' : 'MISSING');
console.log('Key:', supabaseKey ? 'Set (length: ' + supabaseKey.length + ')' : 'MISSING');

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

  const headers = ['ID', 'Code', 'Name', 'Legal Name', 'GST Number', 'PAN Number', 'Email', 'Phone', 
                   'Address', 'City', 'State', 'Pincode', 'Country', 'Is Verified', 'Is Active', 
                   'Payment Terms', 'Currency', 'Created At', 'Updated At'];
  
  worksheet.addRow(headers);
  
  vendors.forEach((v) => {
    worksheet.addRow([
      v.id, v.code, v.name, v.legal_name, v.gst_number, v.pan_number, v.email, v.phone,
      v.address, v.city, v.state, v.pincode, v.country, v.is_verified ? 'Yes' : 'No', 
      v.is_active ? 'Yes' : 'No', v.payment_terms, v.currency, v.created_at, v.updated_at
    ]);
  });

  worksheet.getRow(1).font = { bold: true };
  
  headers.forEach((_, i) => {
    worksheet.getColumn(i + 1).width = [36, 15, 30, 30, 20, 15, 25, 15, 40, 15, 15, 10, 15, 12, 12, 20, 10, 20, 20][i] || 15;
  });

  const outputPath = path.join(__dirname, 'vendors.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Saved: ${outputPath}`);
}

async function exportItems() {
  console.log('\n📊 Fetching items...');
  
  const [{ data: items, error: itemsError }, { data: categories, error: catError }] = await Promise.all([
    supabase.from('items').select('*').order('code'),
    supabase.from('inventory_categories').select('id, name')
  ]);

  if (itemsError) {
    console.error('❌ Error fetching items:', itemsError.message);
    return;
  }

  console.log(`✅ Found ${items?.length || 0} items`);
  if (!items || items.length === 0) return;

  // Build category map
  const catMap = new Map();
  if (categories) {
    categories.forEach(c => catMap.set(c.id, c.name));
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Items');

  const headers = ['ID', 'Item Code', 'Item Name', 'Description', 'Category', 'UOM', 'HSN Code', 
                   'Drawing Number', 'OEM Part No', 'OEM Name', 'Is Verified', 'Is Active', 
                   'Purchase Currency', 'Foreign Unit Price', 'Standard Price', 'Reorder Level', 
                   'Reorder Qty', 'Max Stock', 'Min Stock', 'GST %', 'Created At', 'Updated At'];
  
  worksheet.addRow(headers);
  
  items.forEach((item) => {
    const categoryName = catMap.get(item.category_id) || catMap.get(item.inventory_category_id) || '';
    worksheet.addRow([
      item.id, 
      item.code || item.item_code || '', 
      item.name || item.item_name || '', 
      item.description || '', 
      categoryName,
      item.uom || '', 
      item.hsn_code || '', 
      item.drawing_number || '', 
      item.oem_part_no || '', 
      item.oem_name || '', 
      item.is_verified ? 'Yes' : 'No',
      item.is_active ? 'Yes' : 'No', 
      item.purchase_currency || '', 
      item.foreign_unit_price || '',
      item.standard_price || '', 
      item.reorder_level || '', 
      item.reorder_qty || '', 
      item.max_stock || '', 
      item.min_stock || '',
      item.gst_percentage || '', 
      item.created_at || '', 
      item.updated_at || ''
    ]);
  });

  worksheet.getRow(1).font = { bold: true };
  
  headers.forEach((_, i) => {
    worksheet.getColumn(i + 1).width = [36, 20, 30, 40, 20, 10, 15, 20, 20, 25, 12, 12, 15, 15, 15, 12, 12, 12, 12, 10, 20, 20][i] || 15;
  });

  const outputPath = path.join(__dirname, 'items.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Saved: ${outputPath}`);
}

async function main() {
  console.log('🚀 Starting export...');
  try {
    await exportVendors();
    await exportItems();
    console.log('\n✨ Done! Files saved in:', __dirname);
  } catch (err) {
    console.error('\n❌ Failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
