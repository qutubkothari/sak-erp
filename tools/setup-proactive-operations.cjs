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
    const sql = fs.readFileSync(path.join(root, 'migrations/add-proactive-operations.sql'), 'utf8');
    await prisma.$transaction(async connection => {
      await connection.$executeRawUnsafe('DO $proactive_setup$ BEGIN\n' + sql + '\nEND $proactive_setup$;');
      const tables = await connection.$queryRawUnsafe("SELECT c.relname, c.relrowsecurity AS rls, has_table_privilege('anon',c.oid,'SELECT') AS anonymous, has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('mizantra_attention_items','mizantra_attention_events','mizantra_attention_notifications','mizantra_daily_briefs','mizantra_attention_scans','mizantra_attention_preferences')");
      assert.equal(tables.length, 6, 'Proactive metadata table verification failed');
      assert(tables.every(table => table.rls && !table.anonymous && !table.authenticated), 'Direct attention metadata access must remain denied');
      const functions = await connection.$queryRawUnsafe("SELECT p.proname,has_function_privilege('service_role',p.oid,'EXECUTE') AS service,has_function_privilege('anon',p.oid,'EXECUTE') AS anonymous,has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('mizantra_attention_reconcile','mizantra_attention_state','mizantra_attention_brief')");
      assert.equal(functions.length, 3, 'Proactive RPC verification failed');
      assert(functions.every(entry => entry.service && !entry.anonymous && !entry.authenticated), 'Proactive RPC access is not service-role only');
    }, { timeout: 60000 });
    output(JSON.stringify({ profile: process.env.ERP_TENANT_PROFILE, metadata_tables: 6, rls: true, rpc_access: 'SERVICE_ROLE_ONLY', erp_business_writes: 0 }) + '\n');
  } finally { await prisma.$disconnect(); }
})().catch(error => {
  output(JSON.stringify({ setup_failed: true, error_type: error.name, message: error.name === 'AssertionError' ? error.message : 'Trusted Proactive metadata setup failed' }) + '\n');
  process.exitCode = 1;
});