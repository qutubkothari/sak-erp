require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function exportStockMaster() {
  const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

  console.log('\n=== Exporting Stock Master to Excel ===\n');

  // Fetch all items with stock information
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select(`
      id,
      code,
      name,
      category,
      type,
      uom,
      hsn_code,
      standard_cost,
      selling_price,
      reorder_level,
      reorder_quantity,
      lead_time_days,
      uid_tracking,
      uid_strategy,
      is_active,
      created_at
    `)
    .eq('tenant_id', tenantId)
    .order('code');

  if (itemsError) {
    console.error('❌ Error fetching items:', itemsError);
    return;
  }

  console.log(`✅ Found ${items.length} items`);

  // Fetch stock entries for all items
  const { data: stockEntries, error: stockError } = await supabase
    .from('stock_entries')
    .select('item_id, warehouse_id, quantity, available_quantity, allocated_quantity')
    .eq('tenant_id', tenantId);

  if (stockError) {
    console.error('❌ Error fetching stock:', stockError);
    return;
  }

  console.log(`✅ Found ${stockEntries.length} stock entries`);

  // Fetch warehouses separately
  const { data: warehouses, error: warehousesError } = await supabase
    .from('warehouses')
    .select('id, code, name, location')
    .eq('tenant_id', tenantId);

  if (warehousesError) {
    console.error('❌ Error fetching warehouses:', warehousesError);
    return;
  }

  console.log(`✅ Found ${warehouses.length} warehouses`);

  // Create warehouse lookup map
  const warehouseMap = {};
  warehouses.forEach(wh => {
    warehouseMap[wh.id] = wh;
  });

  // Group stock by item and warehouse
  const stockByItem = {};
  stockEntries.forEach(entry => {
    if (!stockByItem[entry.item_id]) {
      stockByItem[entry.item_id] = {
        total_quantity: 0,
        total_available: 0,
        total_allocated: 0,
        warehouses: []
      };
    }
    
    stockByItem[entry.item_id].total_quantity += parseFloat(entry.quantity || 0);
    stockByItem[entry.item_id].total_available += parseFloat(entry.available_quantity || 0);
    stockByItem[entry.item_id].total_allocated += parseFloat(entry.allocated_quantity || 0);
    
    const warehouse = warehouseMap[entry.warehouse_id];
    if (warehouse) {
      stockByItem[entry.item_id].warehouses.push({
        code: warehouse.code,
        name: warehouse.name,
        location: warehouse.location,
        quantity: parseFloat(entry.quantity || 0),
        available: parseFloat(entry.available_quantity || 0),
        allocated: parseFloat(entry.allocated_quantity || 0)
      });
    }
  });

  // Prepare Excel data
  const excelData = items.map(item => {
    const stock = stockByItem[item.id] || {
      total_quantity: 0,
      total_available: 0,
      total_allocated: 0,
      warehouses: []
    };

    // Warehouse details (concatenate if multiple)
    const warehouseInfo = stock.warehouses.length > 0
      ? stock.warehouses.map(w => `${w.code} (${w.name}): ${w.available} avail`).join('; ')
      : 'No stock';

    return {
      'Item Code': item.code,
      'Item Name': item.name,
      'Category': item.category,
      'Type': item.type,
      'UOM': item.uom,
      'HSN Code': item.hsn_code || '',
      'Standard Cost': item.standard_cost || 0,
      'Selling Price': item.selling_price || 0,
      'Total Quantity': stock.total_quantity,
      'Available Quantity': stock.total_available,
      'Allocated Quantity': stock.total_allocated,
      'Reorder Level': item.reorder_level || 0,
      'Reorder Quantity': item.reorder_quantity || 0,
      'Lead Time (Days)': item.lead_time_days || 0,
      'UID Tracking': item.uid_tracking ? 'Yes' : 'No',
      'UID Strategy': item.uid_strategy || 'N/A',
      'Status': item.is_active ? 'Active' : 'Inactive',
      'Warehouse Details': warehouseInfo,
      'Created Date': item.created_at ? new Date(item.created_at).toLocaleDateString() : ''
    };
  });

  // Create workbook with main sheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Item Code
    { wch: 40 }, // Item Name
    { wch: 20 }, // Category
    { wch: 15 }, // Type
    { wch: 10 }, // UOM
    { wch: 15 }, // HSN Code
    { wch: 12 }, // Standard Cost
    { wch: 12 }, // Selling Price
    { wch: 12 }, // Total Quantity
    { wch: 15 }, // Available Quantity
    { wch: 15 }, // Allocated Quantity
    { wch: 12 }, // Reorder Level
    { wch: 15 }, // Reorder Quantity
    { wch: 15 }, // Lead Time
    { wch: 12 }, // UID Tracking
    { wch: 15 }, // UID Strategy
    { wch: 10 }, // Status
    { wch: 60 }, // Warehouse Details
    { wch: 15 }  // Created Date
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Stock Master');

  // Create detailed warehouse view (separate row per warehouse)
  const warehouseDetails = [];
  items.forEach(item => {
    const stock = stockByItem[item.id];
    if (stock && stock.warehouses.length > 0) {
      stock.warehouses.forEach(wh => {
        warehouseDetails.push({
          'Item Code': item.code,
          'Item Name': item.name,
          'Category': item.category,
          'Type': item.type,
          'UOM': item.uom,
          'Warehouse Code': wh.code,
          'Warehouse Name': wh.name,
          'Location': wh.location,
          'Quantity': wh.quantity,
          'Available': wh.available,
          'Allocated': wh.allocated
        });
      });
    } else {
      // Item with no stock
      warehouseDetails.push({
        'Item Code': item.code,
        'Item Name': item.name,
        'Category': item.category,
        'Type': item.type,
        'UOM': item.uom,
        'Warehouse Code': 'N/A',
        'Warehouse Name': 'No Stock',
        'Location': '',
        'Quantity': 0,
        'Available': 0,
        'Allocated': 0
      });
    }
  });

  const wsWarehouse = XLSX.utils.json_to_sheet(warehouseDetails);
  wsWarehouse['!cols'] = [
    { wch: 15 }, // Item Code
    { wch: 40 }, // Item Name
    { wch: 20 }, // Category
    { wch: 15 }, // Type
    { wch: 10 }, // UOM
    { wch: 15 }, // Warehouse Code
    { wch: 25 }, // Warehouse Name
    { wch: 25 }, // Location
    { wch: 12 }, // Quantity
    { wch: 12 }, // Available
    { wch: 12 }  // Allocated
  ];
  XLSX.utils.book_append_sheet(wb, wsWarehouse, 'Stock by Warehouse');

  // Add summary sheet
  const summary = [
    { Metric: 'Total Items', Value: items.length },
    { Metric: 'Active Items', Value: items.filter(i => i.is_active).length },
    { Metric: 'Inactive Items', Value: items.filter(i => !i.is_active).length },
    { Metric: 'Items with Stock', Value: Object.keys(stockByItem).length },
    { Metric: 'Items without Stock', Value: items.length - Object.keys(stockByItem).length },
    { Metric: 'Raw Materials', Value: items.filter(i => i.type === 'RAW_MATERIAL').length },
    { Metric: 'Finished Goods', Value: items.filter(i => i.type === 'FINISHED_GOOD').length },
    { Metric: 'Sub-Assemblies', Value: items.filter(i => i.type === 'SUB_ASSEMBLY').length },
    { Metric: 'Items with UID Tracking', Value: items.filter(i => i.uid_tracking).length },
    { Metric: 'Total Stock Entries', Value: stockEntries.length }
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summary);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Save file
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `stock-master-export-${timestamp}.xlsx`;
  XLSX.writeFile(wb, filename);

  console.log(`\n✅ Excel file created: ${filename}`);
  console.log(`   - Sheet 1: Stock Master (${items.length} items)`);
  console.log(`   - Sheet 2: Stock by Warehouse (${warehouseDetails.length} entries)`);
  console.log(`   - Sheet 3: Summary\n`);
}

exportStockMaster()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
