const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const { createRequire } = require('node:module');
const root = process.argv[2];
assert.equal(root, '/var/www/arwa-mizantra', 'Readiness is restricted to the existing Arwa deployment');
const req = createRequire(path.join(root, 'apps/api/package.json'));
const dotenv = createRequire(req.resolve('@nestjs/config'))('dotenv');
const api = JSON.parse(cp.execFileSync('pm2', ['jlist'], {encoding:'utf8'})).find(app => app.name === 'arwa-mizantra-api');
assert(api, 'Existing Arwa API process required');
Object.assign(process.env, dotenv.parse(fs.readFileSync(path.join(root, 'apps/api/.env'))), api.pm2_env);
assert.equal(process.env.ERP_TENANT_PROFILE, 'ARWA');
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('pgbouncer', 'true');
process.env.DATABASE_URL = url.toString();
const { PrismaService } = require(path.join(root, 'apps/api/dist/prisma/prisma.service.js'));
const prisma = new PrismaService(new (req('@nestjs/config').ConfigService)());
(async () => {
  await prisma.$connect();
  try {
    const result = await prisma.$transaction(async connection => {
      await connection.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const items = await connection.$queryRawUnsafe("SELECT count(*)::int AS total,count(*) FILTER(WHERE nullif(trim(coalesce(to_jsonb(i)->>'code','')),'') IS NULL)::int AS missing_code,count(*) FILTER(WHERE nullif(trim(coalesce(to_jsonb(i)->>'name','')),'') IS NULL)::int AS missing_name,count(*) FILTER(WHERE nullif(trim(coalesce(to_jsonb(i)->>'uom',to_jsonb(i)->>'unit','')),'') IS NULL)::int AS missing_unit FROM public.items i");
      const suppliers = await connection.$queryRawUnsafe("SELECT count(*)::int AS total,count(*) FILTER(WHERE nullif(trim(coalesce(to_jsonb(v)->>'name','')),'') IS NULL)::int AS missing_name,count(*) FILTER(WHERE nullif(trim(coalesce(to_jsonb(v)->>'code','')),'') IS NULL)::int AS missing_code FROM public.vendors v");
      const duplicates = await connection.$queryRawUnsafe("SELECT count(*)::int AS duplicate_item_code_groups FROM (SELECT tenant_id,upper(trim(code)) FROM public.items WHERE nullif(trim(code),'') IS NOT NULL GROUP BY tenant_id,upper(trim(code)) HAVING count(*)>1) d");
      const links = await connection.$queryRawUnsafe("SELECT count(*)::int AS links,count(*) FILTER(WHERE i.id IS NULL OR v.id IS NULL OR i.tenant_id<>v.tenant_id)::int AS invalid_links FROM public.item_vendors iv LEFT JOIN public.items i ON i.id=iv.item_id LEFT JOIN public.vendors v ON v.id=iv.vendor_id");
      return {profile:'ARWA',scope:'DEPLOYMENT_MASTER_AGGREGATES_NO_CUSTOMER_ROWS',items:items[0],suppliers:suppliers[0],duplicates:duplicates[0],supplier_links:links[0],business_actions_executed:0,business_writes:0,missing_master_template:{items:['code','name','uom','description','category'],suppliers:['code','name','contact_person','email','phone'],required_review:'Use existing Smart Import preview and native approval; do not fabricate procurement documents.'}};
    }, {timeout:30000});
    process.stdout.write(JSON.stringify(result)+'\n');
  } finally { await prisma.$disconnect(); }
})().catch(() => {process.stderr.write('Read-only Arwa readiness query failed; no master changes were attempted.\n');process.exitCode=1;});