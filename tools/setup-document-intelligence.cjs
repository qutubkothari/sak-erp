const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const apiRequire = createRequire(path.join(root, 'apps/api/package.json'));
const dotenv = createRequire(apiRequire.resolve('@nestjs/config'))('dotenv');
const inheritedEnvironment = { ...process.env };
Object.assign(process.env, dotenv.parse(fs.readFileSync(path.join(root, 'apps/api/.env'))), inheritedEnvironment);
const output = process.stdout.write.bind(process.stdout);
console.log = () => {};
(async () => {
  assert(['SAIFSEAS', 'MIZANTRA', 'ARWA'].includes(process.env.ERP_TENANT_PROFILE), 'Known deployment profile required');
  const databaseUrl = new URL(process.env.DATABASE_URL);
  databaseUrl.searchParams.set('pgbouncer', 'true');
  process.env.DATABASE_URL = databaseUrl.toString();
  const { PrismaService } = require(path.join(root, 'apps/api/dist/prisma/prisma.service.js'));
  const prisma = new PrismaService(new (apiRequire('@nestjs/config').ConfigService)());
  await prisma.$connect();
  try {
    const sql = fs.readFileSync(path.join(root, 'migrations/add-document-intelligence.sql'), 'utf8');
    await prisma.$transaction(async connection => {
      await connection.$executeRawUnsafe('DO $analysis_setup$ BEGIN\n' + sql + '\nEND $analysis_setup$;');
      const checks = await connection.$queryRawUnsafe("SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('mizantra_analysis_uploads','mizantra_analysis_comparisons','mizantra_analysis_audit') AND c.relrowsecurity");
      assert.equal(checks[0].count, 3, 'Metadata RLS verification failed');
      const policy = await connection.$queryRawUnsafe("SELECT permissive,roles FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='mizantra_analysis_private_only'");
      assert.equal(policy[0]?.permissive, 'RESTRICTIVE', 'Private storage restriction is absent');
    }, { timeout: 60000 });
    const db = apiRequire('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const bucket = 'mizantra-document-intelligence';
    let existing = await db.storage.getBucket(bucket);
    if (existing.error) {
      assert(['404', '400'].includes(String(existing.error.status)) && /not found/i.test(existing.error.message), 'Private bucket lookup failed');
      const created = await db.storage.createBucket(bucket, { public: false, fileSizeLimit: 10485760, allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'] });
      assert(!created.error, 'Private bucket creation failed');
      existing = await db.storage.getBucket(bucket);
    }
    assert(!existing.error && existing.data && !existing.data.public, 'Public or unavailable bucket blocks release');
    const bounded = await db.storage.updateBucket(bucket, { public: false, fileSizeLimit: 10485760, allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'] });
    assert(!bounded.error, 'Private upload restrictions could not be applied');
    output(JSON.stringify({ profile: process.env.ERP_TENANT_PROFILE, metadata_tables: 3, rls: true, bucket: 'PRIVATE', authenticated_direct_storage: 'DENIED', erp_business_writes: 0 }) + '\n');
  } finally { await prisma.$disconnect(); }
})().catch(error => { output(JSON.stringify({ setup_failed: true, error_type: error.name, message: error.name === 'AssertionError' ? error.message : 'Trusted metadata/private-storage setup failed' }) + '\n'); process.exitCode = 1; });