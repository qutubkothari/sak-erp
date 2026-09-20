const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const USERNAME = process.env.QA_USERNAME || 'hnoman';
const PASSWORD = process.env.QA_PASSWORD || 'Password';
const ENV_FILE = process.env.QA_API_ENV_FILE || path.join(process.cwd(), 'apps/api/.env.test');

function readEnvFile(filePath) {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  };
  if (fs.existsSync(filePath)) {
    const text = fs.readFileSync(filePath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      if (!line || /^\s*#/.test(line) || !line.includes('=')) continue;
      const idx = line.indexOf('=');
      env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
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
  assert(data?.accessToken && data?.user?.tenant_id, 'Login response missing token or tenant', data);
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

function vendorPayload(suffix, overrides = {}) {
  return {
    code: `QA-VND-${suffix}`,
    salutation: 'M/s',
    name: `M/S QA Vendor ${suffix}`,
    legalName: `QA Vendor Legal ${suffix} Private Limited`,
    category: 'Raw Material',
    rating: 4.2,
    taxId: `QA${suffix}`.slice(0, 15).toUpperCase(),
    paymentTerms: 'Net 30',
    creditLimit: 125000,
    address: 'Unit 12 Test Industrial Estate',
    billingLine2: 'Near Test Gate',
    street: 'QA Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    pincode: '400001',
    sameAsBilling: false,
    shippingStreet: 'QA Dispatch Street',
    shippingCity: 'Pune',
    shippingState: 'Maharashtra',
    shippingCountry: 'India',
    shippingPincode: '411001',
    bankName: 'HDFC Bank',
    bankAccountNumber: `9090${suffix.replace(/\D/g, '').slice(-8).padStart(8, '0')}`,
    bankIfscCode: 'HDFC0001234',
    bankBranch: 'Mumbai Fort',
    bankAccountType: 'CURRENT',
    isActive: true,
    contacts: [
      {
        title: 'Commercial',
        name: `QA Primary ${suffix}`,
        email: `qa.vendor.${suffix.toLowerCase()}@example.com`,
        phone: '9876543210',
        designation: 'Accounts',
        isDefault: true,
      },
      {
        title: 'Operations',
        name: `QA Secondary ${suffix}`,
        email: `qa.ops.${suffix.toLowerCase()}@example.com`,
        phone: '9876543211',
        designation: 'Dispatch',
        isDefault: false,
      },
    ],
    ...overrides,
  };
}

async function deleteIfExists(token, code) {
  const vendors = await apiRequest(token, 'GET', `/purchase/vendors?search=${encodeURIComponent(code)}`);
  for (const vendor of vendors || []) {
    if (vendor.code === code) {
      await apiRequest(token, 'DELETE', `/purchase/vendors/${vendor.id}`, undefined, [200, 204]);
    }
  }
}

async function run() {
  const env = readEnvFile(ENV_FILE);
  assert(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY, 'Supabase service env is missing');

  const auth = await apiLogin();
  const token = auth.accessToken;
  const tenantId = auth.user.tenant_id;
  const alternate = await getAlternateCreator(env, tenantId, auth.user.id);
  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const code = `QA-VND-${suffix}`;
  const rejectCode = `QA-VND-RJ-${suffix}`;
  const result = {
    baseUrl: BASE_URL,
    username: USERNAME,
    alternateCreator: alternate.username,
    createdVendorCode: code,
    rejectedVendorCode: rejectCode,
    checks: [],
  };

  await deleteIfExists(token, code);
  await deleteIfExists(token, rejectCode);

  let vendor;
  let rejectedVendor;

  try {
    vendor = await apiRequest(token, 'POST', '/purchase/vendors', vendorPayload(suffix));
    result.checks.push('created vendor');
    assert(vendor.code === code, 'Vendor code mismatch after create', vendor);
    assert(vendor.name.includes('Qa Vendor') || vendor.name.includes('QA Vendor'), 'Vendor trade name not saved', vendor);
    assert(vendor.legal_name.includes('Qa Vendor') || vendor.legal_name.includes('QA Vendor'), 'Legal name not saved', vendor);
    assert(vendor.category === 'Raw Material', 'Category not saved', vendor);
    assert(Number(vendor.rating) === 4.2, 'Rating not saved', vendor);
    assert(vendor.email === `qa.vendor.${suffix.toLowerCase()}@example.com`, 'Default contact email not reflected on vendor', vendor);
    assert(vendor.phone === '+919876543210', 'Default contact phone not normalized/reflected on vendor', vendor);
    assert(vendor.street === 'Qa Street' || vendor.street === 'QA Street', 'Billing street not saved', vendor);
    assert(vendor.shipping_city === 'Pune', 'Shipping city not saved', vendor);
    assert(vendor.bank_name === 'HDFC Bank', 'Bank name not saved', vendor);
    assert(vendor.bank_ifsc_code === 'HDFC0001234', 'IFSC not normalized/saved', vendor);
    assert(vendor.approval_status === 'PENDING', 'New vendor should be pending approval', vendor);
    assert(vendor.is_verified === false, 'New vendor should not be verified', vendor);

    const duplicate = await apiRequest(token, 'POST', '/purchase/vendors/check-duplicates', vendorPayload(suffix), [200, 201]);
    assert(
      duplicate?.hasDuplicates === true &&
        (Array.isArray(duplicate.exactMatches) || Array.isArray(duplicate.fuzzyMatches)),
      'Duplicate check response should be structured',
      duplicate,
    );
    result.checks.push('duplicate check returned structured response');

    const selfApproval = await fetch(`${BASE_URL}/api/v1/purchase/vendors/${vendor.id}/verify`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const selfApprovalBody = await selfApproval.text();
    if (selfApproval.status === 400) {
      assert(/creator cannot approve|maker-checker/i.test(selfApprovalBody), 'Self approval error should explain maker-checker', selfApprovalBody);
      result.checks.push('maker-checker self approval blocked');

      await supabaseRequest(env, 'PATCH', `vendors?id=eq.${vendor.id}&tenant_id=eq.${tenantId}`, { created_by: alternate.id });
      vendor = await apiRequest(token, 'PUT', `/purchase/vendors/${vendor.id}/verify`);
      result.checks.push('approval by checker saved with history');
    } else {
      assert(isAdminOverrideUser(auth.user), 'Only Admin/Super Admin may override maker-checker self approval', {
        status: selfApproval.status,
        body: parseMaybeJson(selfApprovalBody),
        user: auth.user,
      });
      assert([200, 201].includes(selfApproval.status), 'Admin override vendor approval failed', parseMaybeJson(selfApprovalBody));
      vendor = parseMaybeJson(selfApprovalBody);
      result.checks.push('admin/super admin maker-checker override allowed');
    }

    assert(vendor.approval_status === 'APPROVED' && vendor.is_verified === true, 'Vendor approval failed', vendor);
    assert(vendor.approved_by === auth.user.id, 'Approved-by user not saved', vendor);
    assert((vendor.approval_history || []).some((entry) => entry.action === 'APPROVED'), 'Approval history missing APPROVED entry', vendor);

    vendor = await apiRequest(token, 'PUT', `/purchase/vendors/${vendor.id}`, vendorPayload(suffix, {
      legalName: `QA Vendor Legal ${suffix} Edited Private Limited`,
      contacts: [
        {
          title: 'Commercial',
          name: `QA Primary Edited ${suffix}`,
          email: `qa.vendor.edited.${suffix.toLowerCase()}@example.com`,
          phone: '9876543222',
          designation: 'Accounts Head',
          isDefault: true,
        },
      ],
    }));
    assert(vendor.approval_status === 'PENDING' && vendor.is_verified === false, 'Editing approved vendor should require reapproval', vendor);
    assert(vendor.approval_reason === 'Approved vendor edited; reapproval required.', 'Edit reapproval reason missing', vendor);
    assert(vendor.email === `qa.vendor.edited.${suffix.toLowerCase()}@example.com`, 'Edited contact email not reflected', vendor);
    result.checks.push('approved vendor edit moved record back to pending');

    vendor = await apiRequest(token, 'PUT', `/purchase/vendors/${vendor.id}/verify`);
    assert(vendor.approval_status === 'APPROVED' && vendor.is_verified === true, 'Reapproval after edit failed', vendor);
    result.checks.push('reapproval after edit');

    vendor = await apiRequest(token, 'PUT', `/purchase/vendors/${vendor.id}/bank/verify`);
    assert(String(vendor.bank_verification_status || '').toUpperCase() === 'VERIFIED', 'Bank verification status not saved', vendor);
    result.checks.push('bank verification');

    rejectedVendor = await apiRequest(token, 'POST', '/purchase/vendors', vendorPayload(`RJ${suffix}`, {
      code: rejectCode,
      taxId: `RJ${suffix}`.slice(0, 15).toUpperCase(),
      name: `M/S QA Reject Vendor ${suffix}`,
      legalName: `QA Reject Vendor Legal ${suffix}`,
    }));
    await supabaseRequest(env, 'PATCH', `vendors?id=eq.${rejectedVendor.id}&tenant_id=eq.${tenantId}`, { created_by: alternate.id });
    rejectedVendor = await apiRequest(token, 'PUT', `/purchase/vendors/${rejectedVendor.id}/reject`, {
      reason: 'QA rejection path test',
    });
    assert(rejectedVendor.approval_status === 'REJECTED', 'Vendor rejection status not saved', rejectedVendor);
    assert(rejectedVendor.approval_reason === 'QA rejection path test', 'Vendor rejection reason not saved', rejectedVendor);
    assert((rejectedVendor.approval_history || []).some((entry) => entry.action === 'REJECTED'), 'Approval history missing REJECTED entry', rejectedVendor);
    result.checks.push('rejection with reason and history');
  } finally {
    const cleanup = [];
    if (vendor?.id) {
      cleanup.push(apiRequest(token, 'DELETE', `/purchase/vendors/${vendor.id}`, undefined, [200, 204]).catch((error) => ({ error: error.message })));
    }
    if (rejectedVendor?.id) {
      cleanup.push(apiRequest(token, 'DELETE', `/purchase/vendors/${rejectedVendor.id}`, undefined, [200, 204]).catch((error) => ({ error: error.message })));
    }
    result.cleanup = await Promise.all(cleanup);
  }

  const remaining = await apiRequest(token, 'GET', `/purchase/vendors?search=${encodeURIComponent(code)}`);
  assert(!(remaining || []).some((item) => item.code === code), 'Created QA vendor still exists after cleanup', remaining);
  result.checks.push('cleanup verified');

  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
