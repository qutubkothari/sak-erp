/**
 * Script to export Vendors and Items to Excel
 * Run: node export-data-to-excel.js
 * Output: vendors.xlsx and items.xlsx in the project root
 */

const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if available
require('dotenv').config();

// Try to load from apps/api/.env if dotenv didn't find it
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

// Load from various possible env file locations
loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, 'apps', 'api', '.env'));
loadEnvFile(path.join(__dirname, 'apps', 'api', '.env.local'));

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY (or ANON_KEY) must be set in environment variables');
  console.error('   Tried loading from:');
  console.error('   - .env');
  console.error('   - apps/api/.env');
  console.error('   - apps/api/.env.local');
  console.error('');
  console.error('   You can also run with inline env vars:');
  console.error('   SUPABASE_URL=https://... SUPABASE_SERVICE_KEY=... node export-data-to-excel.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportVendors() {
  console.log('📊 Fetching vendors from database...');
  
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Error fetching vendors:', error.message);
    return;
  }

  console.log(`✅ Found ${vendors.length} vendors`);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Vendors');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Code', key: 'code', width: 15 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Legal Name', key: 'legal_name', width: 30 },
    { header: 'GST Number', key: 'gst_number', width: 20 },
    { header: 'PAN Number', key: 'pan_number', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'City', key: 'city', width: 15 },
    { header: 'State', key: 'state', width: 15 },
    { header: 'Pincode', key: 'pincode', width: 10 },
    { header: 'Country', key: 'country', width: 15 },
    { header: 'Is Verified', key: 'is_verified', width: 12 },
    { header: 'Is Active', key: 'is_active', width: 12 },
    { header: 'Payment Terms', key: 'payment_terms', width: 20 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Created At', key: 'created_at', width: 20 },
    { header: 'Updated At', key: 'updated_at', width: 20 },
  ];

  vendors.forEach((vendor) => {
    worksheet.addRow({
      id: vendor.id,
      code: vendor.code,
      name: vendor.name,
      legal_name: vendor.legal_name,
      gst_number: vendor.gst_number,
      pan_number: vendor.pan_number,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      city: vendor.city,
      state: vendor.state,
      pincode: vendor.pincode,
      country: vendor.country,
      is_verified: vendor.is_verified ? 'Yes' : 'No',
      is_active: vendor.is_active ? 'Yes' : 'No',
      payment_terms: vendor.payment_terms,
      currency: vendor.currency,
      created_at: vendor.created_at,
      updated_at: vendor.updated_at,
    });
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  const outputPath = path.join(__dirname, 'vendors.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Vendors exported to: ${outputPath}`);
}

async function exportItems() {
  console.log('📊 Fetching items from database...');
  
  const { data: items, error } = await supabase
    .from('items')
    .select(`
      *,
      category:inventory_categories(name)
    `)
    .order('item_code');

  if (error) {
    console.error('❌ Error fetching items:', error.message);
    return;
  }

  console.log(`✅ Found ${items.length} items`);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Items');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Item Code', key: 'item_code', width: 20 },
    { header: 'Item Name', key: 'item_name', width: 30 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'UOM', key: 'uom', width: 10 },
    { header: 'HSN Code', key: 'hsn_code', width: 15 },
    { header: 'Drawing Number', key: 'drawing_number', width: 20 },
    { header: 'Is Verified', key: 'is_verified', width: 12 },
    { header: 'Is Active', key: 'is_active', width: 12 },
    { header: 'Purchase Currency', key: 'purchase_currency', width: 15 },
    { header: 'Foreign Unit Price', key: 'foreign_unit_price', width: 15 },
    { header: 'Standard Price', key: 'standard_price', width: 15 },
    { header: 'Reorder Level', key: 'reorder_level', width: 12 },
    { header: 'Reorder Qty', key: 'reorder_qty', width: 12 },
    { header: 'Max Stock', key: 'max_stock', width: 12 },
    { header: 'Min Stock', key: 'min_stock', width: 12 },
    { header: 'GST %', key: 'gst_percentage', width: 10 },
    { header: 'Created At', key: 'created_at', width: 20 },
    { header: 'Updated At', key: 'updated_at', width: 20 },
  ];

  items.forEach((item) => {
    worksheet.addRow({
      id: item.id,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description,
      category: item.category?.name || '',
      uom: item.uom,
      hsn_code: item.hsn_code,
      drawing_number: item.drawing_number,
      is_verified: item.is_verified ? 'Yes' : 'No',
      is_active: item.is_active ? 'Yes' : 'No',
      purchase_currency: item.purchase_currency,
      foreign_unit_price: item.foreign_unit_price,
      standard_price: item.standard_price,
      reorder_level: item.reorder_level,
      reorder_qty: item.reorder_qty,
      max_stock: item.max_stock,
      min_stock: item.min_stock,
      gst_percentage: item.gst_percentage,
      created_at: item.created_at,
      updated_at: item.updated_at,
    });
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  const outputPath = path.join(__dirname, 'items.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Items exported to: ${outputPath}`);
}

async function main() {
  console.log('🚀 Starting data export...\n');
  
  try {
    await exportVendors();
    console.log('');
    await exportItems();
    
    console.log('\n✨ Export complete!');
    console.log('📁 Files saved in:', __dirname);
    console.log('   - vendors.xlsx');
    console.log('   - items.xlsx');
  } catch (err) {
    console.error('\n❌ Export failed:', err.message);
    process.exit(1);
  }
}

main();
