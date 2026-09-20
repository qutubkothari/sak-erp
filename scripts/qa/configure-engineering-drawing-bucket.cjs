const path = require("node:path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const bucket = process.env.DRAWING_STORAGE_BUCKET || "engineering-drawings";
const maxBytes =
  Math.max(Number(process.env.DRAWING_MAX_FILE_SIZE_MB) || 500, 1) *
  1024 *
  1024;

if (!url || !key) throw new Error("Supabase storage credentials are missing");

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const lookup = await client.storage.getBucket(bucket);
  if (!lookup.data) {
    const created = await client.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: maxBytes,
    });
    if (created.error && !/exist/i.test(created.error.message)) {
      throw created.error;
    }
  } else {
    const updated = await client.storage.updateBucket(bucket, {
      public: false,
      fileSizeLimit: maxBytes,
    });
    if (updated.error) throw updated.error;
  }

  const verified = await client.storage.getBucket(bucket);
  if (verified.error || !verified.data) {
    throw verified.error || new Error("Bucket verification failed");
  }
  if (verified.data.public) throw new Error("Drawing bucket must be private");

  console.log(
    JSON.stringify({
      configured: true,
      bucket: verified.data.name,
      public: verified.data.public,
      fileSizeLimit: verified.data.file_size_limit,
      allowedMimeTypes: verified.data.allowed_mime_types,
    }),
  );
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
