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
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .ilike('name', '%SAK%');
    
    if (tenantError || !tenants || tenants.length === 0) {
      console.error('❌ Tenant not found:', tenantError);
      return;
    }

    const tenant = tenants[0];
    const tenantId = tenant.id;
    console.log(`✅ Using tenant: ${tenant.name} (${tenantId})\n`);

    // Read vendors from Excel
    const vendorsWb = xlsx.readFile('VENDORS.xlsx');
    const vendorsSheet = vendorsWb.Sheets[vendorsWb.SheetNames[0]];
    const vendorsData = xlsx.utils.sheet_to_json(vendorsSheet, { defval: '' });
    
    console.log(`📊 Found ${vendorsData.length} vendors from Excel\n`);

    let importedCount = 0;
    let skippedCount = 0;
    const vendorMap = new Map();

    for (const row of vendorsData) {
      const vendorName = String(row['Vendor Name'] || '').trim();
      const legalName = String(row['Legal Name'] || vendorName).trim();
      const email = String(row['Email'] || '').trim().toLowerCase() || null;
      const gstin = String(row['Tax ID/GSTIN'] || '').trim() || null;
      
      if (!vendorName) {
        skippedCount++;
        continue;
      }

      try {
        // Check if vendor exists by name
        const { data: existing } = await supabase
          .from('vendors')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('name', vendorName)
          .maybeSingle();

        let vendorId;
        if (existing) {
          console.log(`⏭️  Vendor already exists: ${vendorName}`);
          vendorId = existing.id;
          skippedCount++;
        } else {
          // Generate unique vendor code
          const baseCode = vendorName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 8);
          const vendorCode = `${baseCode}${String(Date.now()).slice(-4)}`;

          // Parse payment terms
          let paymentTerms = 'NET_30';
          const paymentTermsRaw = String(row['Payment Terms'] || '').trim().toUpperCase();
          if (paymentTermsRaw.includes('CASH') || paymentTermsRaw.includes('COD')) {
            paymentTerms = 'CASH_ON_DELIVERY';
          } else if (paymentTermsRaw.includes('ADVANCE')) {
            paymentTerms = 'ADVANCE';
          }

          // Insert vendor
          const { data: newVendor, error } = await supabase
            .from('vendors')
            .insert({
              tenant_id: tenantId,
              code: vendorCode,
              name: vendorName,
              legal_name: legalName,
              email: email,
              phone: row['Phone'] ? String(row['Phone']) : null,
              tax_id: gstin,
              contact_person: String(row['Contact Person'] || '').trim() || null,
              payment_terms: paymentTerms,
              credit_limit: row['Credit Limit'] ? parseFloat(row['Credit Limit']) : null,
              category: String(row['Category'] || '').trim() || null,
              address: [
                String(row['Billing Address'] || '').trim(),
                String(row['Street'] || '').trim(),
                String(row['City'] || '').trim(),
                String(row['State'] || '').trim(),
                String(row['Pin Code'] || '').trim(),
                String(row['Country'] || 'INDIA').trim()
              ].filter(Boolean).join(', ') || null,
              is_active: String(row['Active Vendor'] || 'YES').toUpperCase() === 'YES',
              rating: row['Rating (0-5)'] ? parseFloat(row['Rating (0-5)']) : null,
            })
            .select('id')
            .single();

          if (error) {
            console.error(`❌ Error importing ${vendorName}:`, error.message);
            skippedCount++;
            continue;
          }

          vendorId = newVendor.id;
          console.log(`✅ Imported: ${vendorName} (${vendorCode})`);
          importedCount++;
        }

        // Store for mapping
        vendorMap.set(vendorName.toUpperCase(), vendorId);

      } catch (error) {
        console.error(`❌ Error with vendor ${vendorName}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`\n📊 Vendor Import Summary:`);
    console.log(`   ✅ Imported: ${importedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   📝 Total: ${vendorsData.length}\n`);

    // Map preferred vendors to items
    console.log('🔄 Now mapping preferred vendors to items...\n');

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
        const { data: item } = await supabase
          .from('items')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('code', itemCode)
          .maybeSingle();

        if (!item) {
          notFoundCount++;
          continue;
        }

        const vendorId = vendorMap.get(preferredVendorName.toUpperCase());
        
        if (!vendorId) {
          console.log(`⚠️  Vendor "${preferredVendorName}" not found for item ${itemCode}`);
          notFoundCount++;
          continue;
        }

        // Check if mapping exists
        const { data: existingMapping } = await supabase
          .from('item_vendors')
          .select('id, is_preferred')
          .eq('item_id', item.id)
          .eq('vendor_id', vendorId)
          .maybeSingle();

        if (existingMapping) {
          if (!existingMapping.is_preferred) {
            await supabase
              .from('item_vendors')
              .update({ is_preferred: true })
              .eq('id', existingMapping.id);
            console.log(`✅ Updated preferred vendor for ${itemCode}: ${preferredVendorName}`);
            mappedCount++;
          }
        } else {
          // Create new mapping
          const { error } = await supabase
            .from('item_vendors')
            .insert({
              item_id: item.id,
              vendor_id: vendorId,
              is_preferred: true,
              tenant_id: tenantId,
            });

          if (!error) {
            console.log(`✅ Mapped preferred vendor for ${itemCode}: ${preferredVendorName}`);
            mappedCount++;
          } else {
            console.error(`❌ Error mapping ${itemCode}:`, error.message);
            notFoundCount++;
          }
        }

      } catch (error) {
        console.error(`❌ Error mapping vendor for ${itemCode}:`, error.message);
        notFoundCount++;
      }
    }

    console.log(`\n📊 Preferred Vendor Mapping Summary:`);
    console.log(`   ✅ Mapped: ${mappedCount}`);
    console.log(`   ⚠️  Not found: ${notFoundCount}\n`);

    console.log('✅ Import and mapping completed!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

importVendors().catch(console.error);
