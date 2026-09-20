const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/api/.env' });

async function importVendors() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  try {
    console.log('✅ Connected to Supabase\n');

    // Get tenant ID
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('name', 'SAK Solutions')
      .single();
    
    if (tenantError || !tenant) {
      console.error('❌ Tenant not found:', tenantError);
      return;
    }

    const tenantId = tenant.id;
    console.log(`✅ Using tenant ID: ${tenantId}\n`);

    // Read vendors from Excel
    const vendorsWb = xlsx.readFile('VENDORS.xlsx');
    const vendorsSheet = vendorsWb.Sheets[vendorsWb.SheetNames[0]];
    const vendorsData = xlsx.utils.sheet_to_json(vendorsSheet, { defval: '' });
    
    console.log(`📊 Found ${vendorsData.length} vendors in Excel file\n`);

    let importedCount = 0;
    let skippedCount = 0;
    const vendorMap = new Map();

    for (const row of vendorsData) {
      const vendorName = String(row['Vendor Name'] || '').trim();
      const legalName = String(row['Legal Name'] || vendorName).trim();
      const email = String(row['Email'] || '').trim().toLowerCase();
      const gstin = String(row['Tax ID/GSTIN'] || '').trim();
      
      if (!vendorName) {
        skippedCount++;
        continue;
      }

      try {
        // Check if vendor exists
        const { data: existing } = await supabase
          .from('vendors')
          .select('id')
          .eq('tenant_id', tenantId)
          .or(`name.eq.${vendorName},email.eq.${email || ''},gstin.eq.${gstin || ''}`)
          .limit(1)
          .single();

        let vendorId;
        if (existing) {
          console.log(`⏭️  Vendor already exists: ${vendorName}`);
          vendorId = existing.id;
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

          const insertQuery = `
            INSERT INTO vendors (
              tenant_id, code, name, legal_name, email, phone, gstin,
              contact_person, payment_terms, credit_limit, category,
              billing_address_line1, billing_street, billing_city, billing_state, billing_pin_code, billing_country,
              shipping_address_line1, shipping_street, shipping_city, shipping_state, shipping_pin_code, shipping_country,
              is_active, rating, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
              $12, $13, $14, $15, $16, $17,
              $18, $19, $20,$21, $22, $23,
              $24, $25, NOW(), NOW()
            ) RETURNING id
          `;

          const { data: result, error } = await supabase.rpc('exec_sql', {
            sql: insertQuery,
            params: [
              tenantId,
              vendorCode,
              vendorName,
              legalName || vendorName,
              email || null,
              row['Phone'] ? String(row['Phone']) : null,
              gstin || null,
              String(row['Contact Person'] || '').trim() || null,
              paymentTerms,
              row['Credit Limit'] ? parseFloat(row['Credit Limit']) : null,
              String(row['Category'] || '').trim() || null,
              String(row['Billing Address'] || '').trim() || null,
              String(row['Street'] || '').trim() || null,
              String(row['City'] || '').trim() || null,
              String(row['State'] || '').trim() || null,
              String(row['Pin Code'] || '').trim() || null,
              String(row['Country'] || 'INDIA').trim(),
              String(row['Shipping Address'] || '').trim() || null,
              String(row['Street_1'] || '').trim() || null,
              String(row['City_1'] || '').trim() || null,
              String(row['State_1'] || '').trim() || null,
              String(row['Pin Code_1'] || '').trim() || null,
              String(row['Country_1'] || 'INDIA').trim(),
              String(row['Active Vendor'] || 'YES').toUpperCase() === 'YES',
              row['Rating (0-5)'] ? parseFloat(row['Rating (0-5)']) : null
            ]
          });

          if (error) throw error;
          
          // For insert, need to fetch the ID
          const { data: newVendor } = await supabase
            .from('vendors')
            .select('id')
            .eq('code', vendorCode)
            .single();
          
          vendorId = newVendor.id;
          console.log(`✅ Imported vendor: ${vendorName} (${vendorCode})`);
          importedCount++;
        }

        vendorMap.set(vendorName.toUpperCase(), vendorId);

      } catch (error) {
        console.error(`❌ Error importing vendor ${vendorName}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`\n📊 Vendor Import Summary:`);
    console.log(`   ✅ Imported: ${importedCount}`);
    console.log(`   ⏸️  Skipped: ${skippedCount}`);
    console.log(`   📝 Total: ${vendorsData.length}\n`);

    // Now map preferred vendors to items
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
        const itemResult = await client.query(
          'SELECT id FROM items WHERE tenant_id = $1 AND code = $2 LIMIT 1',
          [tenantId, itemCode]
        );

        if (itemResult.rows.length === 0) {
          notFoundCount++;
          continue;
        }

        const itemId = itemResult.rows[0].id;
        const vendorId = vendorMap.get(preferredVendorName.toUpperCase());
        
        if (!vendorId) {
          console.log(`⚠️  Vendor not found for item ${itemCode}: ${preferredVendorName}`);
          notFoundCount++;
          continue;
        }

        // Check if mapping exists
        const existingMapping = await client.query(
          'SELECT id, is_preferred FROM item_vendors WHERE item_id = $1 AND vendor_id = $2',
          [itemId, vendorId]
        );

        if (existingMapping.rows.length > 0) {
          if (!existingMapping.rows[0].is_preferred) {
            await client.query(
              'UPDATE item_vendors SET is_preferred = true WHERE id = $1',
              [existingMapping.rows[0].id]
            );
            console.log(`✅ Updated preferred vendor for ${itemCode}: ${preferredVendorName}`);
            mappedCount++;
          }
        } else {
          await client.query(
            'INSERT INTO item_vendors (item_id, vendor_id, is_preferred, tenant_id, created_at, updated_at) VALUES ($1, $2, true, $3, NOW(), NOW())',
            [itemId, vendorId, tenantId]
          );
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
    await client.end();
  }
}

importVendors().catch(console.error);
