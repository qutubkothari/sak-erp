const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env'), quiet: true });

const url = String(process.env.SUPABASE_URL || '').trim();
const key = String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '').trim();
const bucket = String(process.env.DRAWING_STORAGE_BUCKET || 'engineering-drawings').trim();

if (!url || !key) throw new Error('Supabase URL/service key is not configured');

const client = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const objectPath = `qa/${Date.now()}-drawing-upload-smoke.dwg`;
const payload = Buffer.from('AC1027\nMIZANTRA-DRAWING-STORAGE-SMOKE\n', 'utf8');

async function main() {
  try {
    const { data: signed, error: signError } = await client.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath, { upsert: false });
    if (signError || !signed?.signedUrl) throw signError || new Error('No signed upload URL');

    const body = new FormData();
    body.append('cacheControl', '3600');
    body.append('', new Blob([payload], { type: 'application/acad' }), 'smoke.dwg');
    const response = await fetch(signed.signedUrl, {
      method: 'PUT',
      headers: { 'x-upsert': 'false' },
      body,
    });
    if (!response.ok) throw new Error(`Signed upload failed: ${response.status} ${await response.text()}`);

    const { data: download, error: downloadError } = await client.storage.from(bucket).download(objectPath);
    if (downloadError || !download) throw downloadError || new Error('Download failed');
    const downloaded = Buffer.from(await download.arrayBuffer());
    if (!downloaded.equals(payload)) throw new Error('Downloaded drawing did not match uploaded bytes');

    process.stdout.write(JSON.stringify({ ok: true, bucket, extension: '.dwg', bytes: payload.length }) + '\n');
  } finally {
    await client.storage.from(bucket).remove([objectPath]);
  }
}

main().catch((error) => {
  process.stderr.write(String(error?.message || error) + '\n');
  process.exit(1);
});
