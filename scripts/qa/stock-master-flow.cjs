const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const USERNAME = process.env.QA_USERNAME || 'hnoman';
const PASSWORD = process.env.QA_PASSWORD || 'Password';
const ENV_FILE = process.env.QA_API_ENV_FILE || path.join(process.cwd(), 'apps/api/.env.test');

function readEnvFile(filePath) {
  const env = {};
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line) || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return env;
}

function assert(condition, message, detail) {
  if (!condition) {
    const suffix = detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`;
    throw new Error(`${message}${suffix}`);
  }
}

function isAdminOverrideUser(user) {
  const labels = [user?.role, user?.role?.name, user?.role_name, user?.roleName, user?.user_role, user?.type]
    .filter(Boolean)
    .map((value) => (typeof value === 'string' ? value : value?.name || ''))
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  for (const row of user?.roles || []) {
    const name = row?.role?.name || row?.name || row?.role_name;
    if (name) labels.push(String(name).toLowerCase());
  }
  return labels.some((label) => label.includes('super') || label.includes('admin'));
}

function parseMaybeJson(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function apiLogin() {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const body = await response.text();
  const data = body ? JSON.parse(body) : null;
  assert(response.ok, `Login failed: ${response.status}`, data);
  return data;
}

async function apiRequest(token, method, endpoint, body, expected = [200, 201]) {
  const response = await fetch(`${BASE_URL}/api/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  assert(expected.includes(response.status), `${method} ${endpoint} returned ${response.status}`, data);
  return data;
}

async function supabaseRequest(env, method, tablePath, body, expected = [200, 204]) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${tablePath}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  assert(expected.includes(response.status), `${method} Supabase ${tablePath} returned ${response.status}`, data);
  return data;
}

async function getAlternateCreator(env, tenantId, currentUserId) {
  const users = await supabaseRequest(
    env,
    'GET',
    `users?select=id,username,first_name,last_name&tenant_id=eq.${tenantId}&is_active=eq.true&limit=50`,
    undefined,
  );
  const alternate = (users || []).find((user) => user.id !== currentUserId);
  assert(alternate, 'No alternate active user found for maker-checker simulation');
  return alternate;
}

function itemPayload(suffix, overrides = {}) {
  return {
    code: `QA-STK-${suffix}`,
    name: `QA Stock Master Item ${suffix}`,
    description: 'quality assurance stock master material',
    category: 'RAW_MATERIAL',
    productCategory: 'QA Materials',
    uom: 'NOS',
    hsnCode: '85423900',
    oemPartNo: `OEM-${suffix}`,
    oemName: 'QA OEM',
    standardCost: 123.45,
    reorderLevel: 5,
    reorderQuantity: 25,
    leadTimeDays: 7,
    minStock: 2,
    maxStock: 100,
    drawingRequired: 'OPTIONAL',
    uidStrategy: 'BATCHED',
    batchUom: 'NOS',
    batchQuantity: 10,
    purchaseCurrency: 'USD',
    foreignUnitPrice: 12.5,
    ...overrides,
  };
}

async function run() {
  const env = readEnvFile(ENV_FILE);
  const auth = await apiLogin();
  const token = auth.accessToken;
  const alternate = await getAlternateCreator(env, auth.user.tenant_id, auth.user.id);
  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const code = `QA-STK-${suffix}`;
  const result = {
    baseUrl: BASE_URL,
    username: USERNAME,
    alternateCreator: alternate.username,
    itemCode: code,
    checks: [],
  };

  const vendors = await apiRequest(token, 'GET', '/purchase/vendors?isActive=true');
  const vendor = (vendors || []).find((row) => row.is_verified === true && row.id && row.name);
  assert(vendor, 'No active verified vendor available for item-vendor test');
  result.vendor = { code: vendor.code, name: vendor.name };

  let item;
  try {
    item = await apiRequest(token, 'POST', '/inventory/items', itemPayload(suffix));
    result.checks.push('created item through UI-facing /inventory/items endpoint');
    assert(item.code === code, 'Item code mismatch after create', item);
    assert(item.name === `QA Stock Master Item ${suffix}`, 'Item name mismatch after create', item);
    assert(item.description === 'Quality Assurance Stock Master Material', 'Description title-case normalization mismatch', item);
    assert(item.category === 'RAW_MATERIAL', 'Category mismatch', item);
    assert(item.uom === 'NOS', 'UOM mismatch', item);
    assert(item.hsn_code === '85423900', 'HSN mismatch', item);
    assert(item.oem_part_no === `OEM-${suffix}`, 'OEM part number mismatch', item);
    assert(item.oem_name === 'QA OEM', 'OEM name mismatch', item);
    assert(Number(item.standard_cost) === 123.45, 'Standard cost mismatch', item);
    assert(Number(item.reorder_level) === 5, 'Reorder level mismatch', item);
    assert(Number(item.reorder_quantity) === 25, 'Reorder quantity mismatch', item);
    assert(item.uid_tracking === true && item.uid_strategy === 'BATCHED', 'Batched UID settings mismatch', item);
    assert(item.batch_uom === 'NOS' && Number(item.batch_quantity) === 10, 'Batch quantity/UOM mismatch', item);
    assert(item.purchase_currency === 'USD' && Number(item.foreign_unit_price) === 12.5, 'Foreign purchase price mismatch', item);
    assert(item.approval_status === 'PENDING' && item.is_verified === false, 'New item should be pending', item);

    const duplicate = await apiRequest(token, 'POST', '/items/check-duplicates', {
      item_code: code,
      item_name: item.name,
      drawing_number: `DRW-${suffix}`,
    });
    assert(duplicate?.hasDuplicates === true, 'Item duplicate check should flag the new item', duplicate);
    result.checks.push('duplicate detection');

    const selfVerify = await fetch(`${BASE_URL}/api/v1/items/${item.id}/verify`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const selfVerifyBody = await selfVerify.text();
    if (selfVerify.status === 400) {
      assert(/creator cannot verify|maker-checker/i.test(selfVerifyBody), 'Self verification error should explain maker-checker', selfVerifyBody);
      result.checks.push('maker-checker self verification blocked');

      await supabaseRequest(env, 'PATCH', `items?id=eq.${item.id}&tenant_id=eq.${auth.user.tenant_id}`, { created_by: alternate.id });
      item = await apiRequest(token, 'PUT', `/items/${item.id}/verify`, {});
    } else {
      assert(isAdminOverrideUser(auth.user), 'Only Admin/Super Admin may override maker-checker self verification', {
        status: selfVerify.status,
        body: parseMaybeJson(selfVerifyBody),
        user: auth.user,
      });
      assert([200, 201].includes(selfVerify.status), 'Admin override item verification failed', parseMaybeJson(selfVerifyBody));
      item = parseMaybeJson(selfVerifyBody);
      result.checks.push('admin/super admin maker-checker override allowed');
    }
    assert(item.is_verified === true || item.approval_status === 'APPROVED', 'Item verification failed', item);
    result.checks.push('item verification');

    const link = await apiRequest(token, 'POST', `/inventory/items/${item.id}/vendors`, {
      vendor_id: vendor.id,
      priority: 1,
      unit_price: 1230.75,
      lead_time_days: 4,
      vendor_item_code: `VIC-${suffix}`,
    });
    assert(link.vendor_id === vendor.id, 'Item-vendor link vendor mismatch', link);
    result.checks.push('item vendor link');

    let itemVendors = await apiRequest(token, 'GET', `/inventory/items/${item.id}/vendors`);
    const linked = (itemVendors || []).find((row) => row.vendor_id === vendor.id);
    assert(linked, 'Linked vendor not returned from item vendors', itemVendors);
    assert(linked.vendor?.name === vendor.name || linked.vendor_name === vendor.name, 'Linked vendor name not returned for display', linked);
    assert(linked.vendor?.code === vendor.code || linked.vendor_code === vendor.code, 'Linked vendor code not returned for display', linked);
    assert(Number(linked.unit_price) === 1230.75, 'Linked vendor price mismatch', linked);
    assert(Number(linked.lead_time_days) === 4, 'Linked vendor lead time mismatch', linked);
    assert(linked.vendor_item_code === `VIC-${suffix}`, 'Vendor item code mismatch', linked);
    result.checks.push('vendor name/code display data');

    const preferred = await apiRequest(token, 'GET', `/items/${item.id}/vendors/preferred`);
    assert(preferred.vendor_id === vendor.id || preferred.id === vendor.id, 'Preferred vendor endpoint did not return linked vendor', preferred);
    assert(
      preferred.vendor_name === vendor.name ||
        preferred.name === vendor.name ||
        preferred.vendor?.name === vendor.name,
      'Preferred vendor endpoint did not return vendor name',
      preferred,
    );
    result.checks.push('preferred vendor returns name');

    await apiRequest(token, 'PUT', `/inventory/items/${item.id}/vendors/${vendor.id}`, {
      priority: 2,
      unit_price: 1500,
      lead_time_days: 6,
      vendor_item_code: `VIC2-${suffix}`,
    });
    itemVendors = await apiRequest(token, 'GET', `/inventory/items/${item.id}/vendors`);
    const updatedLink = (itemVendors || []).find((row) => row.vendor_id === vendor.id);
    assert(Number(updatedLink.priority) === 2, 'Item vendor priority update failed', updatedLink);
    assert(Number(updatedLink.unit_price) === 1500, 'Item vendor price update failed', updatedLink);
    result.checks.push('item vendor update');

    item = await apiRequest(token, 'PUT', `/inventory/items/${item.id}`, {
      name: `QA Stock Master Item ${suffix} Edited`,
      reorderLevel: 8,
      standardCost: 130,
    });
    assert(item.approval_status === 'PENDING' && item.is_verified === false, 'Editing verified item should require reapproval', item);
    assert(Number(item.reorder_level) === 8 && Number(item.standard_cost) === 130, 'Item edit values not saved', item);
    result.checks.push('verified item edit requires reapproval');

    const stock = await apiRequest(token, 'GET', `/items/${item.id}/stock`);
    assert(stock && typeof stock === 'object', 'Item stock endpoint failed', stock);
    const trail = await apiRequest(token, 'GET', `/items/${item.id}/stock-trail`);
    assert(Array.isArray(trail?.trails) && Array.isArray(trail?.currentStock), 'Item stock trail endpoint should return structured trail data', trail);
    result.checks.push('stock summary and trail endpoints');

    await apiRequest(token, 'DELETE', `/inventory/items/${item.id}/vendors/${vendor.id}`, undefined, [200, 204]);
    itemVendors = await apiRequest(token, 'GET', `/inventory/items/${item.id}/vendors`);
    assert(!(itemVendors || []).some((row) => row.vendor_id === vendor.id && row.is_active !== false), 'Item vendor removal failed', itemVendors);
    result.checks.push('item vendor removal');
  } finally {
    if (item?.id) {
      await supabaseRequest(env, 'DELETE', `item_vendors?item_id=eq.${item.id}`);
      result.cleanup = await apiRequest(token, 'DELETE', `/inventory/items/${item.id}`, undefined, [200, 204]).catch((error) => ({ error: error.message }));
    }
  }

  const listed = await apiRequest(token, 'GET', `/inventory/items?search=${encodeURIComponent(code)}&includeInactive=true`);
  const cleanupItem = (listed || []).find((row) => row.code === code);
  assert(cleanupItem?.is_active === false, 'Deleted QA item should be inactive after cleanup', cleanupItem || listed);
  result.checks.push('cleanup verified');

  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
