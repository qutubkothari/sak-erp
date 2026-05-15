const path = require('path');
const dotenv = require('dotenv');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, 'apps', 'api', '.env') });
dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('SUPABASE_URL / SUPABASE_KEY are required.');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  auth: { persistSession: false },
});

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function linkKey(parent, child, qty) {
  return `${normalize(parent)}>>${normalize(child)}>>${Number(qty || 0)}`;
}

async function main() {
  const workbook = xlsx.readFile(path.join(__dirname, 'BOM-LIST-NEW.xlsx'));
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets.RM, { header: 1, defval: '' });
  const headerRow = rows[1] || [];

  const bomNames = headerRow.slice(8).map((value) => String(value || '').trim()).filter(Boolean);
  const bomSet = new Set(bomNames.map(normalize));

  const materialRows = rows
    .slice(3)
    .map((row, index) => ({
      rowNumber: index + 4,
      name: String(row[2] || '').replace(/\s+/g, ' ').trim(),
      qtys: row.slice(8),
    }))
    .filter((row) => row.name);

  const expectedSubBomLinks = [];
  for (let col = 8; col < headerRow.length; col += 1) {
    const parentName = String(headerRow[col] || '').trim();
    if (!parentName) continue;

    for (const row of materialRows) {
      const quantity = Number(row.qtys[col - 8] || 0);
      if (!quantity) continue;
      if (!bomSet.has(normalize(row.name))) continue;

      expectedSubBomLinks.push({
        parent: parentName,
        child: row.name,
        quantity,
      });
    }
  }

  const { data: importedHeaders, error: importedHeadersError } = await supabase
    .from('bom_headers')
    .select('tenant_id')
    .like('notes', 'Imported from BOM-LIST-NEW.xlsx%');

  if (importedHeadersError) throw importedHeadersError;

  const tenantCounts = new Map();
  for (const row of importedHeaders) {
    tenantCounts.set(row.tenant_id, (tenantCounts.get(row.tenant_id) || 0) + 1);
  }

  const [tenantId] = [...tenantCounts.entries()].sort((left, right) => right[1] - left[1])[0] || [];
  if (!tenantId) {
    throw new Error('Could not resolve imported BOM tenant.');
  }

  const { data: headers, error: headersError } = await supabase
    .from('bom_headers')
    .select('id,version,item_id,is_active,notes,effective_from')
    .eq('tenant_id', tenantId);

  if (headersError) throw headersError;

  const itemIds = [...new Set(headers.map((header) => header.item_id).filter(Boolean))];
  const { data: linkedItems, error: linkedItemsError } = await supabase
    .from('items')
    .select('id,name,code')
    .in('id', itemIds);

  if (linkedItemsError) throw linkedItemsError;

  const itemById = new Map(linkedItems.map((item) => [item.id, item]));

  const headerIds = headers.map((header) => header.id);
  const { data: bomItems, error: itemsError } = await supabase
    .from('bom_items')
    .select('id,bom_id,item_id,child_bom_id,component_type,quantity')
    .in('bom_id', headerIds);

  if (itemsError) throw itemsError;

  const headerById = new Map(headers.map((header) => [header.id, header]));
  const headerByName = new Map(
    headers.map((header) => [normalize(itemById.get(header.item_id)?.name || ''), header]),
  );

  const missingHeaders = [...bomSet].filter((name) => !headerByName.has(name));
  const orphanChildRefs = bomItems.filter((row) => row.child_bom_id && !headerById.has(row.child_bom_id));
  const brokenItemRows = bomItems.filter(
    (row) => String(row.component_type || '').toUpperCase() !== 'BOM' && !row.item_id,
  );
  const badSubBomRows = bomItems.filter(
    (row) => String(row.component_type || '').toUpperCase() === 'BOM' && !row.child_bom_id,
  );

  const dbSubBomLinks = bomItems
    .filter((row) => String(row.component_type || '').toUpperCase() === 'BOM')
    .map((row) => ({
      parent:
        itemById.get(headerById.get(row.bom_id)?.item_id)?.name || '',
      child:
        itemById.get(headerById.get(row.child_bom_id)?.item_id)?.name || '',
      quantity: Number(row.quantity || 0),
    }));

  const expectedLinkSet = new Set(expectedSubBomLinks.map((row) => linkKey(row.parent, row.child, row.quantity)));
  const dbLinkSet = new Set(dbSubBomLinks.map((row) => linkKey(row.parent, row.child, row.quantity)));

  const missingSubBomLinks = expectedSubBomLinks.filter(
    (row) => !dbLinkSet.has(linkKey(row.parent, row.child, row.quantity)),
  );
  const extraSubBomLinks = dbSubBomLinks.filter(
    (row) => !expectedLinkSet.has(linkKey(row.parent, row.child, row.quantity)),
  );

  const childrenByParent = new Map();
  for (const row of bomItems) {
    if (!row.child_bom_id) continue;
    const children = childrenByParent.get(row.bom_id) || [];
    children.push(row.child_bom_id);
    childrenByParent.set(row.bom_id, children);
  }

  const visited = new Set();
  const activePath = new Set();
  let cycleCount = 0;

  function visit(headerId) {
    if (activePath.has(headerId)) {
      cycleCount += 1;
      return;
    }
    if (visited.has(headerId)) return;

    visited.add(headerId);
    activePath.add(headerId);
    for (const childId of childrenByParent.get(headerId) || []) {
      visit(childId);
    }
    activePath.delete(headerId);
  }

  for (const header of headers) {
    visit(header.id);
  }

  const childHeaderIds = new Set(dbSubBomLinks.map((_, index) => {
    const row = bomItems.filter((item) => String(item.component_type || '').toUpperCase() === 'BOM')[index];
    return row.child_bom_id;
  }));
  const rootHeaders = headers.filter((header) => !childHeaderIds.has(header.id));
  const subBomHeaders = headers.filter((header) => childHeaderIds.has(header.id));

  const sampleSubBoms = subBomHeaders.slice(0, 10).map((header) => ({
    bomVersion: header.version,
    itemName: itemById.get(header.item_id)?.name || null,
    referencedBy: bomItems.filter((row) => row.child_bom_id === header.id).length,
    components: bomItems.filter((row) => row.bom_id === header.id).length,
  }));

  console.log(
    JSON.stringify(
      {
        expectedBomHeaders: bomSet.size,
        tenantId,
        dbBomHeaders: headers.length,
        missingHeaders,
        rootBomCount: rootHeaders.length,
        subBomHeaderCount: subBomHeaders.length,
        subBomLinksExpected: expectedSubBomLinks.length,
        subBomLinksDb: dbSubBomLinks.length,
        missingSubBomLinkCount: missingSubBomLinks.length,
        missingSubBomLinks: missingSubBomLinks.slice(0, 20),
        extraSubBomLinkCount: extraSubBomLinks.length,
        extraSubBomLinks: extraSubBomLinks.slice(0, 20),
        orphanChildRefs: orphanChildRefs.length,
        brokenItemRows: brokenItemRows.length,
        badSubBomRows: badSubBomRows.length,
        cycleCount,
        sampleSubBoms,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});