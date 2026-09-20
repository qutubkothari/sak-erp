const path = require('path');
const dotenv = require('dotenv');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, 'apps', 'api', '.env') });
dotenv.config();

const VENDOR_FILE = path.join(__dirname, 'vendors-new.xlsx');
const BOM_FILE = path.join(__dirname, 'BOM-LIST-NEW.xlsx');
const RM_SHEET = 'RM';
const DRY_RUN = process.argv.includes('--dry-run');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('SUPABASE_URL / SUPABASE_KEY are required. Expected apps/api/.env to be present.');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const summary = {
  tenantId: null,
  vendors: { inserted: 0, updated: 0, placeholders: 0 },
  items: { inserted: 0, updated: 0 },
  itemVendors: { inserted: 0 },
  boms: { headers: 0, lines: 0 },
  warnings: [],
};

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeKey(value) {
  return normalizeWhitespace(value).toUpperCase();
}

function normalizeBooleanYesNo(value) {
  const normalized = normalizeKey(value);
  if (!normalized) return false;
  return normalized === 'YES' || normalized === 'Y' || normalized === 'TRUE';
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function generateCode(prefix, seed, usedCodes, maxLength = 50) {
  const baseSeed = normalizeWhitespace(seed)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `${prefix}-AUTO`;

  const safePrefix = prefix.toUpperCase();
  const base = `${safePrefix}-${baseSeed}`.slice(0, maxLength);
  let code = base;
  let counter = 1;

  while (usedCodes.has(code)) {
    const suffix = `-${counter}`;
    code = `${base.slice(0, Math.max(1, maxLength - suffix.length))}${suffix}`;
    counter += 1;
  }

  usedCodes.add(code);
  return code;
}

function isInHouseSupplier(value) {
  const supplier = normalizeKey(value);
  return supplier.includes('IN HOUSE') || supplier.includes('IN-HOUSE') || supplier.includes('INHOUSE');
}

function isFinishedGood(name) {
  const normalized = normalizeKey(name);
  return normalized.includes('FINAL ASSY') || normalized.includes('(FG)') || normalized.endsWith(' FG');
}

function buildVendorPayload(row, code, placeholder = false) {
  const name = normalizeWhitespace(row.vendorName || row.name || row['Vendor Name']);
  const legalName = normalizeWhitespace(row.legalName || row['Legal Name'] || name);
  const phoneValue = row.phone ?? row.Phone ?? row['Phone'];
  const phone = normalizeWhitespace(phoneValue);
  const email = normalizeWhitespace(row.email || row.Email || row['Email']).toLowerCase();
  const contactPerson = normalizeWhitespace(row.contactPerson || row['Contact Person']);
  const vendorAddress = normalizeWhitespace(row.vendorAddress || row['Vendor Address']);
  const billingAddress = normalizeWhitespace(row.billingAddress || row['Billing Address']);
  const shippingAddress = normalizeWhitespace(row.shippingAddress || row['Shipping Address']);

  return {
    code,
    name,
    legal_name: legalName || name,
    tax_id: normalizeWhitespace(row.taxId || row['Tax ID/GSTIN']) || null,
    category: normalizeWhitespace(row.category || row.Category) || null,
    rating: normalizeNumber(row.rating || row['Rating (0-5)']),
    payment_terms: normalizeWhitespace(row.paymentTerms || row['Payment Terms']) || null,
    credit_limit: normalizeNumber(row.creditLimit || row['Credit Limit']),
    contact_person: contactPerson || null,
    email: email || null,
    phone: phone || null,
    address: vendorAddress || null,
    street: normalizeWhitespace(row.street || row.Street) || null,
    city: normalizeWhitespace(row.city || row.City) || null,
    state: normalizeWhitespace(row.state || row.State) || null,
    country: normalizeWhitespace(row.country || row.Country) || 'India',
    pincode: normalizeWhitespace(row.pincode || row['Pin Code']) || null,
    shipping_street: normalizeWhitespace(row.shippingStreet || row.Street_1) || null,
    shipping_city: normalizeWhitespace(row.shippingCity || row.City_1) || null,
    shipping_state: normalizeWhitespace(row.shippingState || row.State_1) || null,
    shipping_country: normalizeWhitespace(row.shippingCountry || row.Country_1) || normalizeWhitespace(row.country || row.Country) || 'India',
    shipping_pincode: normalizeWhitespace(row.shippingPincode || row['Pin Code_1']) || null,
    is_active: placeholder ? true : normalizeBooleanYesNo(row.activeVendor || row['Active Vendor'] || 'YES'),
    metadata: {
      source_file: placeholder ? BOM_FILE : VENDOR_FILE,
      import_mode: placeholder ? 'bom-placeholder-supplier' : 'vendor-master',
      placeholder_supplier: placeholder,
      vendor_address: vendorAddress || null,
      billing_address: billingAddress || null,
      shipping_address: shippingAddress || null,
      same_as_billing: normalizeBooleanYesNo(row.sameAsBilling || row['Same as Billing']),
      contacts: contactPerson || phone || email
        ? [{ name: contactPerson, phone, email, isDefault: true }]
        : [],
    },
  };
}

async function resolveTenantId() {
  if (process.env.TENANT_ID) return process.env.TENANT_ID;

  const { data, error } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.tenant_id) {
    throw new Error('Could not resolve tenant_id from active users. Set TENANT_ID explicitly.');
  }
  return data.tenant_id;
}

async function fetchExistingVendors(tenantId) {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, code, name, tax_id')
    .eq('tenant_id', tenantId);

  if (error) throw error;

  return {
    byName: new Map((data || []).map((row) => [normalizeKey(row.name), row])),
    byTaxId: new Map((data || []).filter((row) => row.tax_id).map((row) => [normalizeKey(row.tax_id), row])),
    usedCodes: new Set((data || []).map((row) => row.code).filter(Boolean)),
  };
}

async function upsertVendor(tenantId, payload, vendorState) {
  const normalizedName = normalizeKey(payload.name);
  const normalizedTaxId = normalizeKey(payload.tax_id);
  const existing = vendorState.byTaxId.get(normalizedTaxId) || vendorState.byName.get(normalizedName);

  if (DRY_RUN) {
    return existing || { id: `dry-run-vendor-${payload.code}`, ...payload };
  }

  if (existing) {
    const { data, error } = await supabase
      .from('vendors')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    vendorState.byName.set(normalizedName, data);
    if (normalizedTaxId) vendorState.byTaxId.set(normalizedTaxId, data);
    summary.vendors.updated += 1;
    return data;
  }

  const { data, error } = await supabase
    .from('vendors')
    .insert({ tenant_id: tenantId, ...payload })
    .select()
    .single();

  if (error) throw error;
  vendorState.byName.set(normalizedName, data);
  if (normalizedTaxId) vendorState.byTaxId.set(normalizedTaxId, data);
  summary.vendors.inserted += 1;
  return data;
}

async function importVendors(tenantId) {
  const workbook = xlsx.readFile(VENDOR_FILE);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
  const vendorState = await fetchExistingVendors(tenantId);

  for (const row of rows) {
    if (!normalizeBooleanYesNo(row['Active Vendor'] || 'YES')) continue;

    const vendorName = normalizeWhitespace(row['Vendor Name']);
    if (!vendorName) continue;

    const code = generateCode('VND', vendorName, vendorState.usedCodes);
    const payload = buildVendorPayload(row, code, false);
    await upsertVendor(tenantId, payload, vendorState);
  }

  return vendorState;
}

function readBomRows() {
  const workbook = xlsx.readFile(BOM_FILE);
  const matrix = xlsx.utils.sheet_to_json(workbook.Sheets[RM_SHEET], { header: 1, defval: '' });
  const headers = (matrix[1] || []).map((value) => String(value || ''));
  const assemblyHeaders = headers.slice(8).map((value, idx) => ({
    columnIndex: idx + 8,
    rawName: value,
    name: normalizeWhitespace(value),
    normalizedName: normalizeKey(value),
  })).filter((entry) => entry.name);

  const rows = matrix.slice(3)
    .map((row, index) => ({
      excelRowNumber: index + 4,
      raw: row,
      lifeBuoy: normalizeWhitespace(row[1]),
      itemName: normalizeWhitespace(row[2]),
      partNumber: normalizeWhitespace(row[3]),
      oemPartNumber: normalizeWhitespace(row[4]),
      uom: normalizeWhitespace(row[5]) || 'Number',
      supplier: normalizeWhitespace(row[6]),
      uidRequired: normalizeWhitespace(row[7]),
      normalizedName: normalizeKey(row[2]),
      quantities: row.slice(8),
    }))
    .filter((row) => row.itemName);

  return { assemblyHeaders, rows };
}

async function addPlaceholderVendors(tenantId, vendorState, bomRows) {
  const supplierNames = Array.from(new Set(
    bomRows
      .map((row) => row.supplier)
      .filter((supplier) => supplier && !isInHouseSupplier(supplier))
      .map((supplier) => normalizeWhitespace(supplier)),
  ));

  for (const supplierName of supplierNames) {
    const normalized = normalizeKey(supplierName);
    if (vendorState.byName.has(normalized)) continue;

    const code = generateCode('VND', supplierName, vendorState.usedCodes);
    const payload = buildVendorPayload({ vendorName: supplierName }, code, true);
    const vendor = await upsertVendor(tenantId, payload, vendorState);
    vendorState.byName.set(normalized, vendor);
    summary.vendors.placeholders += 1;
  }
}

async function fetchExistingItems(tenantId) {
  const { data, error } = await supabase
    .from('items')
    .select('id, code, name, type, preferred_vendor_id')
    .eq('tenant_id', tenantId);

  if (error) throw error;

  return {
    byCode: new Map((data || []).map((row) => [row.code, row])),
    byName: new Map((data || []).map((row) => [normalizeKey(row.name), row])),
    usedCodes: new Set((data || []).map((row) => row.code).filter(Boolean)),
  };
}

function classifyItemType(row, assemblyNames) {
  if (isFinishedGood(row.itemName)) return 'FINISHED_GOODS';
  if (isInHouseSupplier(row.supplier) || assemblyNames.has(row.normalizedName)) return 'SUB_ASSEMBLY';
  return 'RAW_MATERIAL';
}

function buildItemPayload(row, code, vendorId, assemblyNames) {
  const itemType = classifyItemType(row, assemblyNames);
  const uidRequired = normalizeKey(row.uidRequired) === 'Y';

  return {
    code,
    name: row.itemName,
    description: row.oemPartNumber ? `OEM Part: ${row.oemPartNumber}` : row.itemName,
    type: itemType,
    category: itemType,
    product_category:
      itemType === 'FINISHED_GOODS'
        ? 'FINISHED GOODS'
        : itemType === 'SUB_ASSEMBLY'
          ? 'SUB ASSEMBLIES'
          : 'RAW MATERIALS',
    uom: row.uom || 'Number',
    is_active: true,
    hsn_code: null,
    preferred_vendor_id: vendorId || null,
    vendor_sort_priority: vendorId ? 1 : null,
    uid_tracking: uidRequired,
    uid_strategy: uidRequired ? 'SERIALIZED' : 'NONE',
    batch_uom: null,
    batch_quantity: null,
    drawing_required: 'NOT_REQUIRED',
    metadata: {
      source_file: BOM_FILE,
      source_sheet: RM_SHEET,
      excel_row: row.excelRowNumber,
      life_buoy_flag: row.lifeBuoy || null,
      sas_part_number: row.partNumber || null,
      oem_part_number: row.oemPartNumber || null,
      supplier_name: row.supplier || null,
      need_uid: row.uidRequired || null,
    },
  };
}

async function upsertItem(tenantId, payload, itemState) {
  const existing = itemState.byCode.get(payload.code) || itemState.byName.get(normalizeKey(payload.name));

  if (DRY_RUN) {
    return existing || { id: `dry-run-item-${payload.code}`, ...payload };
  }

  if (existing) {
    const { data, error } = await supabase
      .from('items')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    itemState.byCode.set(data.code, data);
    itemState.byName.set(normalizeKey(data.name), data);
    summary.items.updated += 1;
    return data;
  }

  const { data, error } = await supabase
    .from('items')
    .insert({ tenant_id: tenantId, ...payload })
    .select()
    .single();

  if (error) throw error;
  itemState.byCode.set(data.code, data);
  itemState.byName.set(normalizeKey(data.name), data);
  summary.items.inserted += 1;
  return data;
}

async function importItems(tenantId, vendorState, assemblyHeaders, bomRows) {
  const itemState = await fetchExistingItems(tenantId);
  const assemblyNames = new Set(assemblyHeaders.map((entry) => entry.normalizedName));
  const itemRegistry = new Map();

  for (const row of bomRows) {
    const vendor = vendorState.byName.get(normalizeKey(row.supplier));
    const code = row.partNumber || generateCode('ITM', row.itemName, itemState.usedCodes);
    if (!row.partNumber) itemState.usedCodes.add(code);

    const payload = buildItemPayload(row, code, vendor?.id || null, assemblyNames);
    const item = await upsertItem(tenantId, payload, itemState);
    itemRegistry.set(row.normalizedName, { row, item });
    if (row.partNumber) itemRegistry.set(normalizeKey(row.partNumber), { row, item });

    if (vendor?.id) {
      await ensureItemVendorLink(tenantId, item.id, vendor.id, row);
    }
  }

  for (const assembly of assemblyHeaders) {
    if (itemRegistry.has(assembly.normalizedName)) continue;

    const syntheticRow = {
      excelRowNumber: null,
      lifeBuoy: '',
      itemName: assembly.name,
      partNumber: '',
      oemPartNumber: '',
      uom: 'Number',
      supplier: isFinishedGood(assembly.name) ? '' : 'In House',
      uidRequired: 'Y',
      normalizedName: assembly.normalizedName,
    };
    const code = generateCode(isFinishedGood(assembly.name) ? 'FG' : 'ASSY', assembly.name, itemState.usedCodes);
    const payload = buildItemPayload(syntheticRow, code, null, assemblyNames);
    const item = await upsertItem(tenantId, payload, itemState);
    itemRegistry.set(assembly.normalizedName, { row: syntheticRow, item });
  }

  return itemRegistry;
}

const itemVendorCache = new Set();

async function ensureItemVendorLink(tenantId, itemId, vendorId, row) {
  const cacheKey = `${itemId}:${vendorId}`;
  if (itemVendorCache.has(cacheKey)) return;

  if (!DRY_RUN) {
    const { data, error } = await supabase
      .from('item_vendors')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('vendor_id', vendorId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      const { error: insertError } = await supabase
        .from('item_vendors')
        .insert({
          tenant_id: tenantId,
          item_id: itemId,
          vendor_id: vendorId,
          priority: 1,
          vendor_item_code: row.oemPartNumber || row.partNumber || null,
          vendor_item_name: row.itemName,
          notes: `Imported from ${path.basename(BOM_FILE)} / ${RM_SHEET}`,
          is_active: true,
        });

      if (insertError) throw insertError;
      summary.itemVendors.inserted += 1;
    }
  }

  itemVendorCache.add(cacheKey);
}

async function fetchExistingBomHeaders(tenantId) {
  const { data, error } = await supabase
    .from('bom_headers')
    .select('id, item_id')
    .eq('tenant_id', tenantId);

  if (error) throw error;
  return new Map((data || []).map((row) => [row.item_id, row]));
}

async function createOrReplaceBomHeader(tenantId, parentItem) {
  const headers = await fetchExistingBomHeaders(tenantId);
  const existing = headers.get(parentItem.id);

  if (DRY_RUN) {
    return existing || { id: `dry-run-bom-${parentItem.id}`, item_id: parentItem.id };
  }

  if (existing) {
    const { error: deleteItemsError } = await supabase
      .from('bom_items')
      .delete()
      .eq('bom_id', existing.id);

    if (deleteItemsError) throw deleteItemsError;
    return existing;
  }

  const { data, error } = await supabase
    .from('bom_headers')
    .insert({
      tenant_id: tenantId,
      item_id: parentItem.id,
      version: 1,
      is_active: true,
      effective_from: new Date().toISOString().slice(0, 10),
      notes: `Imported from ${path.basename(BOM_FILE)} / ${RM_SHEET}`,
    })
    .select()
    .single();

  if (error) throw error;
  summary.boms.headers += 1;
  return data;
}

async function importBoms(tenantId, assemblyHeaders, bomRows, itemRegistry) {
  const bomHeaderByAssembly = new Map();

  for (const assembly of assemblyHeaders) {
    const parent = itemRegistry.get(assembly.normalizedName);
    if (!parent?.item) {
      summary.warnings.push(`Missing parent item for assembly ${assembly.name}`);
      continue;
    }
    const bomHeader = await createOrReplaceBomHeader(tenantId, parent.item);
    bomHeaderByAssembly.set(assembly.normalizedName, bomHeader);
  }

  for (const assembly of assemblyHeaders) {
    const bomHeader = bomHeaderByAssembly.get(assembly.normalizedName);
    const parent = itemRegistry.get(assembly.normalizedName);
    if (!bomHeader || !parent?.item) continue;

    const lineItems = [];
    let sequence = 1;

    for (const row of bomRows) {
      const qty = normalizeNumber(row.raw[assembly.columnIndex]);
      if (!qty || qty <= 0) continue;

      const componentRef = itemRegistry.get(normalizeKey(row.partNumber)) || itemRegistry.get(row.normalizedName);
      if (!componentRef?.item) {
        summary.warnings.push(`Missing component item for row ${row.excelRowNumber}: ${row.itemName}`);
        continue;
      }

      if (componentRef.item.id === parent.item.id) {
        summary.warnings.push(`Skipped self-reference in BOM ${assembly.name} for ${row.itemName}`);
        continue;
      }

      const childBom = bomHeaderByAssembly.get(row.normalizedName);
      if (childBom && childBom.id !== bomHeader.id) {
        lineItems.push({
          bom_id: bomHeader.id,
          item_id: null,
          child_bom_id: childBom.id,
          component_type: 'BOM',
          quantity: qty,
          scrap_percentage: 0,
          sequence: sequence++,
          notes: row.supplier ? `Supplier: ${row.supplier}` : null,
        });
      } else {
        lineItems.push({
          bom_id: bomHeader.id,
          item_id: componentRef.item.id,
          child_bom_id: null,
          component_type: 'ITEM',
          quantity: qty,
          scrap_percentage: 0,
          sequence: sequence++,
          notes: row.supplier ? `Supplier: ${row.supplier}` : null,
        });
      }
    }

    if (DRY_RUN) {
      summary.boms.lines += lineItems.length;
      continue;
    }

    if (lineItems.length > 0) {
      const { error } = await supabase.from('bom_items').insert(lineItems);
      if (error) throw error;
      summary.boms.lines += lineItems.length;
    }
  }
}

async function main() {
  const tenantId = await resolveTenantId();
  summary.tenantId = tenantId;

  console.log(`Using tenant: ${tenantId}`);
  console.log(DRY_RUN ? 'Running in dry-run mode' : 'Running in write mode');

  const vendorState = await importVendors(tenantId);
  const { assemblyHeaders, rows } = readBomRows();
  await addPlaceholderVendors(tenantId, vendorState, rows);
  const itemRegistry = await importItems(tenantId, vendorState, assemblyHeaders, rows);
  await importBoms(tenantId, assemblyHeaders, rows, itemRegistry);

  console.log('\n=== Import Summary ===');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('\nImport failed:', error);
  process.exit(1);
});