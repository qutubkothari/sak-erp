const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.nwkaruzvzwwuftjquypk:Sak3998515253@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkGRNUIDs() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // First, get the GRN with SET ROLE bypassing RLS
    const grnResult = await client.query(
      "SET ROLE postgres; SELECT id, grn_number, status, tenant_id FROM grn WHERE grn_number = $1",
      ['GRN-2025-11-001']
    );

    if (grnResult.rows.length === 0) {
      console.log('❌ GRN-2025-11-001 not found');
      // Let's see all GRNs
      const allGRNs = await client.query("SELECT grn_number, status FROM grn ORDER BY created_at DESC LIMIT 5");
      console.log('\nRecent GRNs:', JSON.stringify(allGRNs.rows, null, 2));
      return;
    }

    const grn = grnResult.rows[0];
    console.log('GRN:', JSON.stringify(grn, null, 2));

    // Check for UIDs with this grn_id
    const uidResult = await client.query(
      "SELECT uid, entity_type, status, location FROM uid_registry WHERE grn_id = $1",
      [grn.id]
    );

    console.log('\n📦 UIDs found:', uidResult.rows.length);
    if (uidResult.rows.length > 0) {
      console.log('\nFirst 5 UIDs:', JSON.stringify(uidResult.rows.slice(0, 5), null, 2));
    } else {
      console.log('⚠️  No UIDs were generated for this GRN!');
    }

    // Also check grn_items for this GRN
    const itemsResult = await client.query(
      "SELECT id, item_code, item_name, accepted_qty, batch_number FROM grn_items WHERE grn_id = $1",
      [grn.id]
    );

    console.log('\n📋 GRN Items:', itemsResult.rows.length);
    if (itemsResult.rows.length > 0) {
      console.log(JSON.stringify(itemsResult.rows, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkGRNUIDs().catch(console.error);
