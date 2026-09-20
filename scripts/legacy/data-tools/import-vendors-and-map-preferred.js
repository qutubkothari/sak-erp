const xlsx = require('xlsx');
const path = require('path');
const { PrismaClient } = require('./packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function importVendorsAndMapPreferred() {
  try {
    console.log('🔄 Starting vendor import and mapping...\n');

    // Read vendors from Excel
    const vendorsWb = xlsx.readFile('VENDORS.xlsx');
    const vendorsSheet = vendorsWb.Sheets[vendorsWb.SheetNames[0]];
    const vendorsData = xlsx.utils.sheet_to_json(vendorsSheet, { defval: '' });
    
    console.log(`📊 Found ${vendorsData.length} vendors in Excel file\n`);

    // Get tenant ID
    const tenant = await prisma.tenants.findFirst({
      where: { name: 'SAK Solutions' }
    });
    
    if (!tenant) {
      console.error('❌ Tenant not found');
      return;
    }

    const tenantId = tenant.id;
    console.log(`✅ Using tenant: ${tenant.name} (${tenantId})\n`);

    // Import vendors
    let importedCount = 0;
    let skippedCount = 0;
    const vendorMap = new Map(); // Map vendor name to vendor ID

    for (const row of vendorsData) {
      const vendorName = String(row['Vendor Name'] || '').trim();
      const legalName = String(row['Legal Name'] || vendorName).trim();
      const email = String(row['Email'] || '').trim().toLowerCase();
      const gstin = String(row['Tax ID/GSTIN'] || '').trim();
      
      if (!vendorName) {
        console.log(`⚠️  Skipping row with no vendor name`);
        skippedCount++;
        continue;
      }

      try {
        // Check if vendor exists
        const existing = await prisma.vendors.findFirst({
          where: {
            tenant_id: tenantId,
            OR: [
              { name: vendorName },
              email ? { email: email } : undefined,
              gstin ? { gstin: gstin } : undefined,
            ].filter(Boolean)
          }
        });

        let vendor;
        if (existing) {
          console.log(`⏭️  Vendor already exists: ${vendorName}`);
          vendor = existing;
          skippedCount++;
        } else {
          // Create vendor code
          const vendorCode = vendorName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 10) + String(importedCount + 1).padStart(3, '0');

          // Parse payment terms
          let paymentTerms = 'NET_30';
          const paymentTermsRaw = String(row['Payment Terms'] || '').trim().toUpperCase();
          if (paymentTermsRaw.includes('CASH') || paymentTermsRaw.includes('COD')) {
            paymentTerms = 'CASH_ON_DELIVERY';
          } else if (paymentTermsRaw.includes('ADVANCE')) {
            paymentTerms = 'ADVANCE';
          }

          vendor = await prisma.vendors.create({
            data: {
              tenant_id: tenantId,
              code: vendorCode,
              name: vendorName,
              legal_name: legalName || vendorName,
              email: email || null,
              phone: row['Phone'] ? String(row['Phone']) : null,
              gstin: gstin || null,
              contact_person: String(row['Contact Person'] || '').trim() || null,
              payment_terms: paymentTerms,
              credit_limit: row['Credit Limit'] ? parseFloat(row['Credit Limit']) : null,
              category: String(row['Category'] || '').trim() || null,
              billing_address_line1: String(row['Billing Address'] || '').trim() || null,
              billing_street: String(row['Street'] || '').trim() || null,
              billing_city: String(row['City'] || '').trim() || null,
              billing_state: String(row['State'] || '').trim() || null,
              billing_pin_code: String(row['Pin Code'] || '').trim() || null,
              billing_country: String(row['Country'] || 'INDIA').trim(),
              shipping_address_line1: String(row['Shipping Address'] || '').trim() || null,
              shipping_street: String(row['Street_1'] || '').trim() || null,
              shipping_city: String(row['City_1'] || '').trim() || null,
              shipping_state: String(row['State_1'] || '').trim() || null,
              shipping_pin_code: String(row['Pin Code_1'] || '').trim() || null,
              shipping_country: String(row['Country_1'] || 'INDIA').trim(),
              is_active: String(row['Active Vendor'] || 'YES').toUpperCase() === 'YES',
              rating: row['Rating (0-5)'] ? parseFloat(row['Rating (0-5)']) : null,
            }
          });

          console.log(`✅ Imported vendor: ${vendorName} (${vendor.code})`);
          importedCount++;
        }

        // Store in map for preferred vendor mapping
        vendorMap.set(vendorName.toUpperCase(), vendor.id);

      } catch (error) {
        console.error(`❌ Error importing vendor ${vendorName}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`\n📊 Vendor Import Summary:`);
    console.log(`   ✅ Imported: ${importedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   📝 Total: ${vendorsData.length}\n`);

    // Now map preferred vendors to items from master list
    console.log('🔄 Mapping preferred vendors to items...\n');

    const masterWb = xlsx.readFile('3. Master List of Raw Material Saif Automations (1).xlsx');
    const masterSheet = masterWb.Sheets[masterWb.SheetNames[0]];
    const masterData = xlsx.utils.sheet_to_json(masterSheet, { defval: '' });

    console.log(`📊 Found ${masterData.length} items in master list\n`);

    let mappedCount = 0;
    let notFoundCount = 0;

    for (const row of masterData) {
      const itemCode = String(row['ITEM_CODE'] || row['Item Code'] || row['Code'] || '').trim();
      const preferredVendorName = String(row['VENDOR'] || row['Vendor'] || row['Preferred Vendor'] || '').trim();

      if (!itemCode || !preferredVendorName) {
        continue;
      }

      try {
        // Find item
        const item = await prisma.items.findFirst({
          where: {
            tenant_id: tenantId,
            code: itemCode
          }
        });

        if (!item) {
          console.log(`⚠️  Item not found: ${itemCode}`);
          notFoundCount++;
          continue;
        }

        // Find vendor ID from map
        const vendorId = vendorMap.get(preferredVendorName.toUpperCase());
        
        if (!vendorId) {
          console.log(`⚠️  Vendor not found for item ${itemCode}: ${preferredVendorName}`);
          notFoundCount++;
          continue;
        }

        // Check if mapping already exists
        const existingMapping = await prisma.item_vendors.findFirst({
          where: {
            item_id: item.id,
            vendor_id: vendorId
          }
        });

        if (existingMapping) {
          // Update to make it preferred
          if (!existingMapping.is_preferred) {
            await prisma.item_vendors.update({
              where: { id: existingMapping.id },
              data: { is_preferred: true }
            });
            console.log(`✅ Updated preferred vendor for ${itemCode}: ${preferredVendorName}`);
            mappedCount++;
          }
        } else {
          // Create new mapping
          await prisma.item_vendors.create({
            data: {
              item_id: item.id,
              vendor_id: vendorId,
              is_preferred: true,
              tenant_id: tenantId,
            }
          });
          console.log(`✅ Mapped preferred vendor for ${itemCode}: ${preferredVendorName}`);
          mappedCount++;
        }

      } catch (error) {
        console.error(`❌ Error mapping vendor for item ${itemCode}:`, error.message);
        notFoundCount++;
      }
    }

    console.log(`\n📊 Preferred Vendor Mapping Summary:`);
    console.log(`   ✅ Mapped: ${mappedCount}`);
    console.log(`   ⚠️  Not found: ${notFoundCount}\n`);

    console.log('✅ Import and mapping completed successfully!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importVendorsAndMapPreferred().catch(console.error);
