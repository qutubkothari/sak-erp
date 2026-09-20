const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const QA_TENANT_SUBDOMAIN = process.env.QA_TENANT_SUBDOMAIN || 'saif-qa-uat';
const QA_PASSWORD = process.env.QA_PASSWORD || 'Password';

function assert(condition, message, detail) {
  if (!condition) {
    const suffix = detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`;
    throw new Error(`${message}${suffix}`);
  }
}

async function sb(method, tablePath, body, expected = [200, 201, 204]) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${tablePath}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
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
  assert(expected.includes(response.status), `${method} ${tablePath} returned ${response.status}`, data);
  return data;
}

function fullPermissions() {
  const modules = [
    'Purchase Management',
    'Sales Management',
    'Inventory',
    'Production',
    'Quality Control',
    'HR Management',
    'Service Management',
    'BOM & Engineering',
    'Documents',
    'Reports',
    'Settings',
    'Accounts',
  ];
  return modules.map((module) => ({
    module,
    view: true,
    create: true,
    edit: true,
    delete: true,
    approve: true,
  }));
}

async function getOrCreateTenant() {
  const existing = await sb(
    'GET',
    `tenants?select=*&subdomain=eq.${encodeURIComponent(QA_TENANT_SUBDOMAIN)}&limit=1`,
    undefined,
    [200],
  );
  if (existing?.[0]) return existing[0];

  const created = await sb('POST', 'tenants', {
    id: crypto.randomUUID(),
    name: 'SAIF QA UAT',
    subdomain: QA_TENANT_SUBDOMAIN,
    is_active: true,
    settings: {},
    metadata: { purpose: 'isolated-live-qa-tenant', createdBy: 'codex-release-gate' },
  });
  return created[0];
}

async function getOrCreateRole(tenantId, code, name) {
  const existing = await sb(
    'GET',
    `roles?select=*&tenant_id=eq.${tenantId}&code=eq.${encodeURIComponent(code)}&limit=1`,
    undefined,
    [200],
  );
  if (existing?.[0]) return existing[0];

  const created = await sb('POST', 'roles', {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    code,
    name,
    description: 'Isolated QA role',
    permissions: fullPermissions(),
  });
  return created[0];
}

async function getOrCreateUser(tenantId, roleId, username, firstName, lastName) {
  const existing = await sb(
    'GET',
    `users?select=*&tenant_id=eq.${tenantId}&username=eq.${encodeURIComponent(username)}&limit=1`,
    undefined,
    [200],
  );
  if (existing?.[0]) {
    const updated = await sb('PATCH', `users?id=eq.${existing[0].id}`, {
      password: QA_PASSWORD,
      role_id: roleId,
      is_active: true,
      first_name: firstName,
      last_name: lastName,
      metadata: { ...(existing[0].metadata || {}), purpose: 'isolated-live-qa-user' },
    });
    return updated[0];
  }

  const created = await sb('POST', 'users', {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    username,
    email: `${username}@sak-qa.local`,
    password: QA_PASSWORD,
    first_name: firstName,
    last_name: lastName,
    role_id: roleId,
    is_active: true,
    metadata: { purpose: 'isolated-live-qa-user' },
  });
  return created[0];
}

async function getOrCreateWarehouse(tenantId) {
  const existing = await sb(
    'GET',
    `warehouses?select=*&tenant_id=eq.${tenantId}&code=eq.QA_MAIN&limit=1`,
    undefined,
    [200],
  );
  if (existing?.[0]) return existing[0];

  const created = await sb('POST', 'warehouses', {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    code: 'QA_MAIN',
    name: 'QA Main Warehouse',
    location: 'Isolated QA',
    address: 'Live QA tenant only',
    is_active: true,
  });
  return created[0];
}

async function getOrCreateVendor(tenantId, checkerUserId) {
  const existing = await sb(
    'GET',
    `vendors?select=*&tenant_id=eq.${tenantId}&code=eq.QA-VENDOR-001&limit=1`,
    undefined,
    [200],
  );
  if (existing?.[0]) {
    const updated = await sb('PATCH', `vendors?id=eq.${existing[0].id}`, {
      is_active: true,
      is_verified: true,
      approval_status: 'APPROVED',
      approved_by: checkerUserId,
      approved_at: new Date().toISOString(),
    });
    return updated[0];
  }

  const created = await sb('POST', 'vendors', {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    code: 'QA-VENDOR-001',
    name: 'M/S QA Verified Supplier',
    legal_name: 'QA Verified Supplier Private Limited',
    tax_id: '27AAACQ0001Q1Z5',
    category: 'Raw Material',
    rating: 4.5,
    payment_terms: 'NET_30',
    credit_limit: 1000000,
    contact_person: 'QA Supplier Contact',
    email: 'qa.supplier@sak-qa.local',
    phone: '+919999999999',
    address: 'QA Industrial Area, Mumbai, Maharashtra, India',
    is_active: true,
    metadata: {
      contacts: [
        {
          name: 'QA Supplier Contact',
          email: 'qa.supplier@sak-qa.local',
          phone: '+919999999999',
          isDefault: true,
        },
      ],
      salutation: 'M/s',
      purpose: 'isolated-live-qa-supplier',
      vendorApproval: {
        status: 'APPROVED',
        approvedAt: new Date().toISOString(),
        approvedBy: checkerUserId,
      },
      vendorApprovalTrail: [
        {
          action: 'APPROVED',
          at: new Date().toISOString(),
          userId: checkerUserId,
        },
      ],
    },
    created_by: checkerUserId,
    is_verified: true,
    approval_status: 'APPROVED',
    approved_by: checkerUserId,
    approved_at: new Date().toISOString(),
  });
  return created[0];
}

async function main() {
  assert(SUPABASE_URL && SUPABASE_SERVICE_KEY, 'SUPABASE_URL and SUPABASE_SERVICE_KEY are required');

  const tenant = await getOrCreateTenant();
  const adminRole = await getOrCreateRole(tenant.id, 'QA_SUPER_ADMIN', 'QA Super Admin');
  const managerRole = await getOrCreateRole(tenant.id, 'QA_MANAGER', 'QA Manager');
  const userRole = await getOrCreateRole(tenant.id, 'QA_USER', 'QA Normal User');
  const admin = await getOrCreateUser(tenant.id, adminRole.id, 'qa_live_admin', 'QA', 'Admin');
  const manager = await getOrCreateUser(tenant.id, managerRole.id, 'qa_live_manager', 'QA', 'Manager');
  const normal = await getOrCreateUser(tenant.id, userRole.id, 'qa_live_user', 'QA', 'User');
  const warehouse = await getOrCreateWarehouse(tenant.id);
  const vendor = await getOrCreateVendor(tenant.id, manager.id);

  console.log(JSON.stringify({
    tenant: { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain },
    users: [
      { id: admin.id, username: admin.username },
      { id: manager.id, username: manager.username },
      { id: normal.id, username: normal.username },
    ],
    warehouse: { id: warehouse.id, code: warehouse.code, name: warehouse.name },
    vendor: { id: vendor.id, code: vendor.code, name: vendor.name },
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
