/*
 * Document Workflow smoke test
 *
 * Usage (PowerShell):
 *   $env:API_BASE_URL='https://your-api-host';
 *   $env:AUTH_TOKEN='Bearer <jwt>'  # or just <jwt>
 *   node scripts/test-document-workflow.js
 */

const DEFAULT_TIMEOUT_MS = 30_000;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function normalizeAuthHeader(token) {
  if (!token) return undefined;
  return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
}

async function httpJson({ baseUrl, method, path, token, body }) {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  const headers = {
    'content-type': 'application/json',
  };

  const auth = normalizeAuthHeader(token);
  if (auth) headers.authorization = auth;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg = typeof data === 'object' && data && data.message ? data.message : text;
      throw new Error(`${method} ${path} -> ${res.status} ${res.statusText}: ${msg}`);
    }

    return data;
  } finally {
    clearTimeout(t);
  }
}

async function httpMultipart({ baseUrl, method, path, formData }) {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      body: formData,
      signal: controller.signal,
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg = typeof data === 'object' && data && data.message ? data.message : text;
      throw new Error(`${method} ${path} -> ${res.status} ${res.statusText}: ${msg}`);
    }

    return data;
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const baseUrl = requiredEnv('API_BASE_URL');
  const token = requiredEnv('AUTH_TOKEN');

  const staffEmail = process.env.STAFF_EMAIL;
  const managerEmail = process.env.MANAGER_EMAIL;

  const clientEmail = process.env.CLIENT_EMAIL || 'client@example.com';
  const clientName = process.env.CLIENT_NAME || 'Client';
  const skipClient = process.env.SKIP_CLIENT === '1';
  const doClientUpload = process.env.DO_CLIENT_UPLOAD === '1';

  const now = new Date();
  const suffix = now.toISOString().replace(/[:.]/g, '-');

  console.log('Creating document...');
  const created = await httpJson({
    baseUrl,
    method: 'POST',
    path: '/documents',
    token,
    body: {
      title: `Smoke Test Document ${suffix}`,
      description: 'Created by scripts/test-document-workflow.js',
      document_type: process.env.DOC_TYPE || 'GENERAL',
      file_url: process.env.FILE_URL || 'https://example.com',
      file_name: process.env.FILE_NAME || `smoke-test-${suffix}.txt`,
      file_size: 1,
      file_type: 'text/plain',
    },
  });

  const documentId = created.id;
  if (!documentId) throw new Error('Create document did not return an id');

  console.log(`Created document: ${documentId} (${created.status})`);

  async function getStatus() {
    const doc = await httpJson({
      baseUrl,
      method: 'GET',
      path: `/documents/${documentId}`,
      token,
    });
    return doc?.status;
  }

  console.log('Forward to staff (PENDING_REVIEW)...');
  await httpJson({
    baseUrl,
    method: 'POST',
    path: `/documents/${documentId}/forward-to-staff`,
    token,
    body: {
      comments: 'Smoke test: forward-to-staff',
      ...(staffEmail ? { recipientEmail: staffEmail } : {}),
    },
  });
  console.log('Status:', await getStatus());

  console.log('Return to admin (PENDING_APPROVAL)...');
  await httpJson({
    baseUrl,
    method: 'POST',
    path: `/documents/${documentId}/return-to-admin`,
    token,
    body: { comments: 'Smoke test: return-to-admin' },
  });
  console.log('Status:', await getStatus());

  console.log('Forward to manager (still PENDING_APPROVAL, sets approved_by)...');
  await httpJson({
    baseUrl,
    method: 'POST',
    path: `/documents/${documentId}/forward-to-manager`,
    token,
    body: {
      comments: 'Smoke test: forward-to-manager',
      ...(managerEmail ? { recipientEmail: managerEmail } : {}),
    },
  });
  console.log('Status:', await getStatus());

  if (!skipClient) {
    console.log('Send to client (SENT_TO_CLIENT)...');
    const sent = await httpJson({
      baseUrl,
      method: 'POST',
      path: `/documents/${documentId}/send-to-client`,
      token,
      body: {
        clientEmail,
        clientName,
        message: 'Smoke test: please ignore',
        expiry_days: 1,
      },
    });
    console.log('Status:', await getStatus());

    if (doClientUpload) {
      if (!sent?.token) throw new Error('send-to-client did not return token');
      console.log('Client uploading revision via token...');

      const form = new FormData();
      const blob = new Blob([`Client revision upload ${suffix}`], { type: 'text/plain' });
      form.append('file', blob, `client-rev-${suffix}.txt`);
      form.append('comments', 'Smoke test: client upload');

      const uploadRes = await httpMultipart({
        baseUrl,
        method: 'POST',
        path: `/client/upload/${sent.token}`,
        formData: form,
      });

      console.log('Client upload response:', uploadRes);
      console.log('Status after client upload:', await getStatus());
    }

    console.log('Final approve (APPROVED)...');
    await httpJson({
      baseUrl,
      method: 'POST',
      path: `/documents/${documentId}/final-approve`,
      token,
      body: {},
    });
    console.log('Status:', await getStatus());
  } else {
    console.log('SKIP_CLIENT=1 set; skipping send-to-client + final approve.');
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exitCode = 1;
});
