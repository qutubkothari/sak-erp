const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const TENANT_ID = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const started = Date.now();

  const [bomHeadersRes, bomItemsRes, itemsRes] = await Promise.all([
    supabase.from('bom_headers').select('id,item_id,version,is_active,tenant_id').eq('tenant_id', TENANT_ID),
    supabase.from('bom_items').select('id,bom_id,item_id,child_bom_id,quantity'),
    supabase.from('items').select('id,code,name,type,product_category,tenant_id').eq('tenant_id', TENANT_ID),
  ]);

  if (bomHeadersRes.error) throw new Error(`bom_headers error: ${JSON.stringify(bomHeadersRes.error)}`);
  if (bomItemsRes.error) throw new Error(`bom_items error: ${JSON.stringify(bomItemsRes.error)}`);
  if (itemsRes.error) throw new Error(`items error: ${JSON.stringify(itemsRes.error)}`);

  const bomHeaders = bomHeadersRes.data || [];
  const items = itemsRes.data || [];
  const tenantBomHeaderIds = new Set(bomHeaders.map(b => b.id));
  const bomItems = (bomItemsRes.data || []).filter(bi => tenantBomHeaderIds.has(bi.bom_id));

  const bomHeaderById = new Map(bomHeaders.map(b => [b.id, b]));
  const itemById = new Map(items.map(i => [i.id, i]));

  const orphanBomItems = bomItems.filter(bi => !bomHeaderById.has(bi.bom_id));
  const missingBothRefs = bomItems.filter(bi => !bi.item_id && !bi.child_bom_id);
  const missingItemRefs = bomItems.filter(bi => bi.item_id && !itemById.has(bi.item_id));
  const missingChildBomRefs = bomItems.filter(bi => bi.child_bom_id && !bomHeaderById.has(bi.child_bom_id));
  const selfCycles = bomItems.filter(bi => bi.child_bom_id && bi.child_bom_id === bi.bom_id);
  const headerMissingItem = bomHeaders.filter(bh => !bh.item_id || !itemById.has(bh.item_id));

  const bomsByItem = new Map();
  for (const bh of bomHeaders) {
    const key = bh.item_id || '__null__';
    if (!bomsByItem.has(key)) bomsByItem.set(key, []);
    bomsByItem.get(key).push(bh);
  }
  const duplicateItemBoms = [...bomsByItem.entries()].filter(([itemId, list]) => itemId !== '__null__' && list.length > 1);
  const duplicateActiveBoms = duplicateItemBoms
    .map(([itemId, list]) => ({ itemId, list, active: list.filter(x => x.is_active) }))
    .filter(x => x.active.length > 1);

  const childGraph = new Map();
  for (const bh of bomHeaders) childGraph.set(bh.id, []);
  for (const bi of bomItems) {
    if (bi.child_bom_id && childGraph.has(bi.bom_id)) childGraph.get(bi.bom_id).push(bi.child_bom_id);
  }
  const recursiveCycles = [];
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map([...childGraph.keys()].map(k => [k, WHITE]));
  const stack = [];
  function dfs(node) {
    color.set(node, GRAY);
    stack.push(node);
    for (const c of (childGraph.get(node) || [])) {
      if (!childGraph.has(c)) continue;
      const state = color.get(c) ?? WHITE;
      if (state === WHITE) dfs(c);
      else if (state === GRAY) {
        const idx = stack.indexOf(c);
        recursiveCycles.push(idx >= 0 ? stack.slice(idx).concat(c) : [node, c, node]);
      }
    }
    stack.pop();
    color.set(node, BLACK);
  }
  for (const node of childGraph.keys()) if ((color.get(node) ?? WHITE) === WHITE) dfs(node);

  const subAssemblyItems = items.filter(i => (i.type || '').toUpperCase().includes('SUB') || (i.product_category || '').toUpperCase().includes('SUB ASSEMB'));
  const bomItemIds = new Set(bomHeaders.map(b => b.item_id).filter(Boolean));
  const subAssembliesWithoutBom = subAssemblyItems.filter(i => !bomItemIds.has(i.id));

  const result = {
    totals: {
      bom_headers: bomHeaders.length,
      bom_items: bomItems.length,
      items: items.length,
      bom_rows_child_bom: bomItems.filter(bi => !!bi.child_bom_id).length,
      bom_rows_direct_item: bomItems.filter(bi => !!bi.item_id).length,
    },
    integrity: {
      orphan_bom_items: orphanBomItems.length,
      bom_items_missing_both_item_and_child: missingBothRefs.length,
      bom_items_with_missing_item_ref: missingItemRefs.length,
      bom_items_with_missing_child_bom_ref: missingChildBomRefs.length,
      bom_headers_with_missing_item_ref: headerMissingItem.length,
      immediate_self_cycles: selfCycles.length,
      recursive_cycles: recursiveCycles.length,
    },
    duplicates: {
      items_with_multiple_boms: duplicateItemBoms.length,
      items_with_multiple_active_boms: duplicateActiveBoms.length,
    },
    sub_assembly_coverage: {
      detected_sub_assembly_items: subAssemblyItems.length,
      sub_assemblies_without_any_bom_header: subAssembliesWithoutBom.length,
    },
    samples: {
      missing_both_refs: missingBothRefs.slice(0, 10),
      missing_item_refs: missingItemRefs.slice(0, 10),
      missing_child_bom_refs: missingChildBomRefs.slice(0, 10),
      duplicate_active_boms: duplicateActiveBoms.slice(0, 10).map(x => ({
        itemId: x.itemId,
        itemCode: itemById.get(x.itemId)?.code || null,
        itemName: itemById.get(x.itemId)?.name || null,
        activeBomIds: x.active.map(a => a.id),
      })),
      recursive_cycle_paths: recursiveCycles.slice(0, 5),
      sub_assemblies_without_bom: subAssembliesWithoutBom.slice(0, 20).map(i => ({ id: i.id, code: i.code, name: i.name, type: i.type, product_category: i.product_category })),
    },
    elapsed_ms: Date.now() - started,
  };

  console.log('BOM_DEEP_CHECK_RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('BOM_DEEP_CHECK_RESULT_END');
}

main().catch((err) => {
  console.error('BOM_DEEP_CHECK_ERROR_START');
  console.error(err?.stack || err);
  console.error('BOM_DEEP_CHECK_ERROR_END');
  process.exit(1);
});
