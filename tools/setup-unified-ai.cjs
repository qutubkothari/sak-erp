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
    const migration = fs.readFileSync(path.join(root, 'migrations/add-unified-ai.sql'), 'utf8');
    await prisma.$transaction(async connection => {
      await connection.$executeRawUnsafe('DO $unified_setup$ BEGIN\n' + migration + '\nEND $unified_setup$;');
      const tables = await connection.$queryRawUnsafe("SELECT c.relname,c.relrowsecurity AS rls,has_table_privilege('anon',c.oid,'SELECT') AS anonymous,has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated,has_table_privilege('service_role',c.oid,'SELECT,INSERT,DELETE') AS service FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('mizantra_unified_sessions','mizantra_unified_telemetry')");
      assert.equal(tables.length, 2, 'Unified metadata table verification failed');
      assert(tables.every(table => table.rls && !table.anonymous && !table.authenticated && table.service), 'Unified metadata access must remain service-role only');
      const columns = await connection.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='mizantra_unified_telemetry'");
      assert(!columns.some(column => /prompt|message|chat|payload|content/.test(column.column_name)), 'Telemetry must not contain confidential content');
    }, { timeout: 60000 });
    output(JSON.stringify({ profile:process.env.ERP_TENANT_PROFILE,metadata_tables:2,rls:true,access:'SERVICE_ROLE_ONLY',erp_business_writes:0 }) + '\n');
  } finally { await prisma.$disconnect(); }
})().catch(error => {
  output(JSON.stringify({ setup_failed:true,error_type:error.name,message:error.name === 'AssertionError' ? error.message : 'Trusted Unified AI metadata setup failed' }) + '\n');
  process.exitCode = 1;
});