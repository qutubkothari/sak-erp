const { createClient } = require('@supabase/supabase-js');

const fs = require('fs');

function loadEnvFromFile(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore
  }
}

loadEnvFromFile('/home/ubuntu/sak-erp/.env');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.log('Missing SUPABASE_URL/SUPABASE_KEY');
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const code = 'FG-001';

  const itemRes = await supabase
    .from('items')
    .select('id, code, name')
    .eq('code', code)
    .limit(5);

  if (itemRes.error) throw itemRes.error;
  if (!itemRes.data || itemRes.data.length === 0) {
    console.log('Item not found: ' + code);
    return;
  }

  const item = itemRes.data[0];
  console.log('Item: ' + item.code + ' - ' + item.name + ' (id=' + item.id + ')');

  const bomRes = await supabase
    .from('bom')
    .select('id, version, is_active, item_id')
    .eq('item_id', item.id)
    .order('is_active', { ascending: false })
    .order('version', { ascending: false })
    .limit(5);

  if (bomRes.error) throw bomRes.error;
  if (!bomRes.data || bomRes.data.length === 0) {
    console.log('BOM: none');
    return;
  }

  const topBom = bomRes.data[0];
  console.log(
    'Top BOM: ' +
      topBom.id +
      ' (v' +
      topBom.version +
      (topBom.is_active ? ', active' : '') +
      ')',
  );

  const biRes = await supabase
    .from('bom_items')
    .select('id, bom_id, item_id, quantity, child_bom_id')
    .eq('bom_id', topBom.id);

  if (biRes.error) throw biRes.error;

  const bomItems = Array.isArray(biRes.data) ? biRes.data : [];
  const childCount = bomItems.filter((x) => Boolean(x.child_bom_id)).length;
  const itemCount = bomItems.filter((x) => Boolean(x.item_id)).length;

  console.log(
    'Top BOM lines: ' +
      bomItems.length +
      ' (child_bom_id=' +
      childCount +
      ', item_id=' +
      itemCount +
      ')',
  );

  if (childCount === 0) return;

  const childBomIds = Array.from(
    new Set(bomItems.map((x) => x.child_bom_id).filter(Boolean)),
  );

  const childBomsRes = await supabase
    .from('bom')
    .select('id, item_id, version, is_active')
    .in('id', childBomIds);

  if (childBomsRes.error) throw childBomsRes.error;

  const childBoms = Array.isArray(childBomsRes.data) ? childBomsRes.data : [];
  const childItemIds = Array.from(new Set(childBoms.map((b) => b.item_id).filter(Boolean)));

  const childItemsRes = await supabase
    .from('items')
    .select('id, code, name')
    .in('id', childItemIds);

  if (childItemsRes.error) throw childItemsRes.error;

  const childItems = Array.isArray(childItemsRes.data) ? childItemsRes.data : [];
  const itemById = new Map(childItems.map((ci) => [ci.id, ci]));

  console.log('Child BOMs referenced: ' + childBoms.length);
  childBoms.slice(0, 20).forEach((cb) => {
    const ci = itemById.get(cb.item_id);
    console.log(
      '- ' +
        (ci ? ci.code : cb.item_id) +
        ' - ' +
        (ci ? ci.name : '') +
        ' (bom=' +
        cb.id +
        ')',
    );
  });

  if (childBoms.length > 20) {
    console.log('... (' + (childBoms.length - 20) + ' more)');
  }
}

main().catch((err) => {
  console.error('ERROR:', err?.message || err);
  process.exit(1);
});
