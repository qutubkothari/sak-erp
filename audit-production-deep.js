const path = require('path');
const dotenv = require('dotenv');
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

async function fetchAll(table, select, filter) {
  let query = supabase.from(table).select(select);
  if (filter) {
    query = filter(query);
  }

  const pageSize = 1000;
  let from = 0;
  let rows = [];

  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = data || [];
    rows = rows.concat(batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function resolveImportedTenantId() {
  const headers = await fetchAll(
    'bom_headers',
    'tenant_id, notes',
    (query) => query.like('notes', 'Imported from BOM-LIST-NEW.xlsx%'),
  );

  const counts = new Map();
  for (const row of headers) {
    counts.set(row.tenant_id, (counts.get(row.tenant_id) || 0) + 1);
  }

  const [tenantId] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0] || [];
  if (!tenantId) {
    throw new Error('Could not resolve imported tenant from bom_headers.');
  }
  return tenantId;
}

async function main() {
  const tenantId = await resolveImportedTenantId();

  const [
    tenants,
    users,
    roles,
    userRoles,
    employees,
    vendors,
    items,
    bomHeaders,
    itemVendors,
    inventoryStock,
    stockMovements,
    documents,
    customers,
    purchaseOrders,
    salesOrders,
  ] = await Promise.all([
    fetchAll('tenants', 'id,name,is_active'),
    fetchAll('users', 'id,tenant_id,username,email,is_active'),
    fetchAll('roles', 'id,tenant_id,name'),
    fetchAll('user_roles', 'user_id,role_id'),
    fetchAll('employees', 'id,tenant_id,user_id', (query) => query.eq('tenant_id', tenantId)),
    fetchAll('vendors', 'id,tenant_id,code,name,legal_name,tax_id,is_active,metadata,created_at', (query) => query.eq('tenant_id', tenantId)),
    fetchAll('items', 'id,tenant_id,code,name,type,product_category,uid_tracking,uid_strategy,preferred_vendor_id,is_active,metadata', (query) => query.eq('tenant_id', tenantId)),
    fetchAll('bom_headers', 'id,tenant_id,item_id,version,is_active,notes,effective_from', (query) => query.eq('tenant_id', tenantId)),
    fetchAll('item_vendors', 'id,tenant_id,item_id,vendor_id,is_active', (query) => query.eq('tenant_id', tenantId)),
    fetchAll('inventory_stock', 'id,tenant_id', (query) => query.eq('tenant_id', tenantId)),
    fetchAll('stock_movements', 'id,tenant_id', (query) => query.eq('tenant_id', tenantId)),
    fetchAll('documents', 'id,tenant_id', (query) => query.eq('tenant_id', tenantId)),
    fetchAll('customers', 'id,tenant_id', (query) => query.eq('tenant_id', tenantId)),
    fetchAll('purchase_orders', 'id,tenant_id', (query) => query.eq('tenant_id', tenantId)),
    fetchAll('sales_orders', 'id,tenant_id', (query) => query.eq('tenant_id', tenantId)),
  ]);

  const bomHeaderIds = bomHeaders.map((row) => row.id);
  const bomItems = bomHeaderIds.length
    ? await fetchAll('bom_items', 'id,bom_id,item_id,child_bom_id,component_type,quantity', (query) => query.in('bom_id', bomHeaderIds))
    : [];

  const roleById = new Map(roles.map((row) => [row.id, row]));
  const userById = new Map(users.map((row) => [row.id, row]));
  const vendorById = new Map(vendors.map((row) => [row.id, row]));
  const itemById = new Map(items.map((row) => [row.id, row]));
  const bomHeaderById = new Map(bomHeaders.map((row) => [row.id, row]));

  const rolesPerUser = new Map();
  for (const link of userRoles) {
    const bucket = rolesPerUser.get(link.user_id) || [];
    const role = roleById.get(link.role_id);
    if (role) bucket.push(role.name);
    rolesPerUser.set(link.user_id, bucket);
  }

  const activeUsers = users.filter((row) => row.is_active);
  const activeUsersForTenant = activeUsers.filter((row) => row.tenant_id === tenantId);
  const superAdmins = activeUsers.filter((row) => (rolesPerUser.get(row.id) || []).includes('Super Admin'));
  const usersWithoutRoles = activeUsers.filter((row) => (rolesPerUser.get(row.id) || []).length === 0);

  const placeholderVendors = vendors.filter((row) => row?.metadata?.placeholder_supplier === true);
  const vendorMasterVendors = vendors.filter((row) => row?.metadata?.import_mode === 'vendor-master');

  const itemsByType = items.reduce((acc, row) => {
    const key = row.type || 'UNKNOWN';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const uidEnabledItems = items.filter((row) => row.uid_tracking === true || row.uid_tracking === 'true');
  const uidStrategyCounts = items.reduce((acc, row) => {
    const key = row.uid_strategy || 'NULL';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const preferredVendorMissing = items.filter(
    (row) => row.preferred_vendor_id && !vendorById.has(row.preferred_vendor_id),
  );

  const badItemVendorLinks = itemVendors.filter(
    (row) => !itemById.has(row.item_id) || !vendorById.has(row.vendor_id),
  );

  const bomHeadersMissingItems = bomHeaders.filter((row) => !itemById.has(row.item_id));
  const orphanBomItems = bomItems.filter((row) => !bomHeaderById.has(row.bom_id));
  const brokenItemRows = bomItems.filter(
    (row) => normalize(row.component_type) !== 'BOM' && !row.item_id,
  );
  const badSubBomRows = bomItems.filter(
    (row) => normalize(row.component_type) === 'BOM' && !row.child_bom_id,
  );
  const orphanChildBomRefs = bomItems.filter(
    (row) => row.child_bom_id && !bomHeaderById.has(row.child_bom_id),
  );

  const importedBomHeaders = bomHeaders.filter((row) => String(row.notes || '').includes('Imported from BOM-LIST-NEW.xlsx'));
  const importedVendorNames = new Set(vendors.map((row) => normalize(row.name)));

  const report = {
    tenant: {
      id: tenantId,
      name: tenants.find((row) => row.id === tenantId)?.name || null,
    },
    access: {
      tenants: tenants.length,
      usersTotal: users.length,
      usersActive: activeUsers.length,
      usersActiveForImportedTenant: activeUsersForTenant.length,
      rolesTotal: roles.length,
      userRoleLinks: userRoles.length,
      superAdminUsers: superAdmins.map((row) => ({ username: row.username, email: row.email })),
      activeUsersWithoutRoles: usersWithoutRoles.map((row) => ({ username: row.username, email: row.email })),
    },
    importedMasterData: {
      vendorsTotal: vendors.length,
      vendorMasterVendors: vendorMasterVendors.length,
      placeholderVendors: placeholderVendors.length,
      itemsTotal: items.length,
      itemTypes: itemsByType,
      uidEnabledItems: uidEnabledItems.length,
      uidStrategies: uidStrategyCounts,
      itemVendorLinks: itemVendors.length,
      bomHeaders: bomHeaders.length,
      importedBomHeaders: importedBomHeaders.length,
      bomLines: bomItems.length,
    },
    operationalDataStillEmpty: {
      employees: employees.length,
      inventoryStock: inventoryStock.length,
      stockMovements: stockMovements.length,
      documents: documents.length,
      customers: customers.length,
      purchaseOrders: purchaseOrders.length,
      salesOrders: salesOrders.length,
    },
    integrity: {
      preferredVendorMissing: preferredVendorMissing.length,
      badItemVendorLinks: badItemVendorLinks.length,
      bomHeadersMissingItems: bomHeadersMissingItems.length,
      orphanBomItems: orphanBomItems.length,
      brokenItemRows: brokenItemRows.length,
      badSubBomRows: badSubBomRows.length,
      orphanChildBomRefs: orphanChildBomRefs.length,
    },
    samples: {
      placeholderVendors: placeholderVendors.slice(0, 20).map((row) => ({ code: row.code, name: row.name })),
      usersWithoutRoles: usersWithoutRoles.slice(0, 20).map((row) => ({ username: row.username, email: row.email })),
      preferredVendorMissing: preferredVendorMissing.slice(0, 20).map((row) => ({ code: row.code, name: row.name })),
      badItemVendorLinks: badItemVendorLinks.slice(0, 20),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});