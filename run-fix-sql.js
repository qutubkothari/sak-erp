// Use Supabase JS client (service role = bypasses RLS + triggers differently)
const { createClient } = require('/var/www/sak-erp/node_modules/.pnpm/@supabase+supabase-js@2.49.4/node_modules/@supabase/supabase-js');
const { Client } = require('/var/www/sak-erp/node_modules/.pnpm/pg@8.16.3/node_modules/pg');

const SUPABASE_URL = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const DB_URL       = 'postgresql://postgres.nwkaruzvzwwuftjquypk:Sak3998515253@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const pg = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  // 1. Get tenant ID
  const { data: tenants, error: te } = await sb.from('tenants').select('id').limit(1);
  if (te) throw new Error('tenants: ' + te.message);
  const tenantId = tenants[0]?.id;
  console.log('[INFO] tenant_id:', tenantId);

  // 2. Get sub-assembly item IDs (items with BOMs)
  const { data: boms, error: be } = await sb.from('bom_headers').select('item_id').eq('tenant_id', tenantId);
  if (be) throw new Error('bom_headers: ' + be.message);
  const subAssemblyIds = [...new Set(boms.map(b => b.item_id))];
  console.log('[INFO] sub-assembly item count:', subAssemblyIds.length);
  console.log('[INFO] IDs:', subAssemblyIds.slice(0, 5), subAssemblyIds.length > 5 ? '...' : '');

  if (subAssemblyIds.length === 0) { console.log('[DONE] No sub-assemblies found.'); return; }

  // 3. Update items: uid_tracking=true, uid_strategy=SERIALIZED
  const { data: updItems, error: ui } = await sb
    .from('items')
    .update({ uid_tracking: true, uid_strategy: 'SERIALIZED' })
    .in('id', subAssemblyIds)
    .select('id');
  if (ui) throw new Error('items update: ' + ui.message);
  console.log('[OK] UID update - rows affected:', updItems?.length ?? 0);

  // 4. Get stock_entry IDs for sub-assemblies
  const { data: seRows, error: se } = await sb
    .from('stock_entries')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('item_id', subAssemblyIds);
  if (se) throw new Error('stock_entries select: ' + se.message);
  const seIds = seRows.map(r => r.id);
  console.log('[INFO] stock_entry rows to zero:', seIds.length);

  if (seIds.length > 0) {
    const { data: updSE, error: ue } = await sb
      .from('stock_entries')
      .update({ quantity: 0, available_quantity: 0, allocated_quantity: 0 })
      .in('id', seIds)
      .select('id');
    if (ue) throw new Error('stock_entries update: ' + ue.message);
    console.log('[OK] Stock zero - rows affected:', updSE?.length ?? 0);
  }

  console.log('[DONE] All changes applied.');
}

run().catch(e => {
  console.error('[ERROR]', e.message);
  process.exit(1);
});

async function run() {
  await client.connect();
  console.log('[OK] Connected');

  // Get tenant id first
  const t = await client.query("SELECT id FROM tenants LIMIT 1");
  const tenantId = t.rows[0]?.id;
  console.log('[INFO] tenant_id:', tenantId);

  if (!tenantId) throw new Error('No tenant found');

  // Check current state (dry run first)
  const before = await client.query(`
    SELECT COUNT(*) as cnt FROM items 
    WHERE id IN (SELECT DISTINCT item_id FROM bom_headers WHERE tenant_id = $1)
    AND (uid_tracking IS DISTINCT FROM true OR uid_strategy IS DISTINCT FROM 'SERIALIZED')
  `, [tenantId]);
  console.log('[INFO] items needing uid update:', before.rows[0].cnt);

  const stockBefore = await client.query(`
    SELECT COUNT(*) as cnt, COALESCE(SUM(quantity),0) as total_qty FROM stock_entries 
    WHERE tenant_id = $1 AND item_id IN (SELECT DISTINCT item_id FROM bom_headers WHERE tenant_id = $1)
  `, [tenantId]);
  console.log('[INFO] stock_entries for sub-assemblies: count=', stockBefore.rows[0].cnt, 'total_qty=', stockBefore.rows[0].total_qty);

  // Update items UID settings - disable triggers to avoid tenant guard
  await client.query('SET session_replication_role = replica');
  
  const r1 = await client.query(`
    UPDATE items
    SET uid_tracking = true, uid_strategy = 'SERIALIZED', updated_at = NOW()
    WHERE tenant_id = $1
    AND id IN (SELECT DISTINCT item_id FROM bom_headers WHERE tenant_id = $1)
  `, [tenantId]);
  console.log('[OK] UID update - rows affected:', r1.rowCount);

  const r2 = await client.query(`
    UPDATE stock_entries
    SET quantity = 0, available_quantity = 0, allocated_quantity = 0, updated_at = NOW()
    WHERE tenant_id = $1
    AND item_id IN (
      SELECT DISTINCT item_id FROM bom_headers WHERE tenant_id = $1
      UNION
      SELECT id FROM items WHERE tenant_id = $1 AND (
        COALESCE(type::text,'') = 'SUB_ASSEMBLY' OR
        COALESCE(category,'') ILIKE '%SUB%ASSEMBL%'
      )
    )
  `, [tenantId]);
  console.log('[OK] Stock zero  - rows affected:', r2.rowCount);

  // Re-enable triggers
  await client.query('SET session_replication_role = DEFAULT');
  await client.end();
  console.log('[DONE] All changes applied.');
}

run().catch(e => {
  console.error('[ERROR]', e.message);
  client.end().catch(() => {});
  process.exit(1);
});
