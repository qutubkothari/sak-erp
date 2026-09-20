const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.nwkaruzvzwwuftjquypk:Sak3998515253@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function generateMissingUIDs() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const grnId = '6cb0e48e-8eb3-45e0-a7ad-55eabee210ee';
    const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
    const userId = tenantId; // Use tenant_id as user for now

    // Get GRN items
    const itemsResult = await client.query(
      "SELECT * FROM grn_items WHERE grn_id = $1",
      [grnId]
    );

    console.log(`Found ${itemsResult.rows.length} items in GRN\n`);

    let totalUIDs = 0;
    for (const grnItem of itemsResult.rows) {
      const acceptedQty = parseInt(grnItem.accepted_qty) || 0;
      console.log(`\nProcessing: ${grnItem.item_code} - ${grnItem.item_name}`);
      console.log(`Accepted Qty: ${acceptedQty}`);

      if (acceptedQty === 0) {
        console.log('⏭️  Skipping - no accepted quantity');
        continue;
      }

      // Get item details
      const { rows: items } = await client.query(
        "SELECT id, code, name, category FROM items WHERE code = $1",
        [grnItem.item_code]
      );

      if (items.length === 0) {
        console.log(`⚠️  Item not found: ${grnItem.item_code}`);
        continue;
      }

      const item = items[0];

      // Determine entity type
      let entityType = 'RM'; // Raw Material
      if (item.category?.includes('COMPONENT')) entityType = 'CP';
      else if (item.category?.includes('FINISHED')) entityType = 'FG';
      else if (item.category?.includes('ASSEMBLY')) entityType = 'SA';

      console.log(`Entity Type: ${entityType}`);
      console.log(`Generating ${acceptedQty} UIDs...`);

      // Generate UIDs
      for (let i = 0; i < acceptedQty; i++) {
        // Generate simple UID format: SAIF-MFG-RM-YYYYMMDD-XXXX
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const sequence = String(totalUIDs + i + 1).padStart(4, '0');
        const uid = `SAIF-MFG-${entityType}-${date}-${sequence}`;

        const { error } = await client.query(
          `INSERT INTO uid_registry (
            tenant_id, uid, entity_type, entity_id, 
            grn_id, batch_number, location, lifecycle, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            tenantId,
            uid,
            entityType,
            item.id,
            grnId,
            grnItem.batch_number || null,
            'Warehouse',
            JSON.stringify([{
              stage: 'RECEIVED',
              timestamp: new Date().toISOString(),
              location: 'Warehouse',
              reference: `GRN-2025-11-001`,
              user: userId,
            }]),
            JSON.stringify({
              item_code: grnItem.item_code,
              item_name: grnItem.item_name,
              grn_item_id: grnItem.id,
            })
          ]
        );

        if (error) {
          console.error(`❌ Error inserting UID ${uid}:`, error);
        }
      }

      totalUIDs += acceptedQty;
      console.log(`✅ Generated ${acceptedQty} UIDs for ${grnItem.item_code}`);
    }

    console.log(`\n🎉 Total UIDs generated: ${totalUIDs}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

generateMissingUIDs().catch(console.error);
