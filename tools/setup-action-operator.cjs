const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
const dotenv = createRequire(apiRequire.resolve("@nestjs/config"))("dotenv");
const inheritedEnvironment = { ...process.env };
Object.assign(
  process.env,
  dotenv.parse(fs.readFileSync(path.join(root, "apps/api/.env"))),
  inheritedEnvironment,
);
const output = process.stdout.write.bind(process.stdout);
console.log = () => {};
(async () => {
  assert(
    ["SAIFSEAS", "MIZANTRA", "ARWA"].includes(process.env.ERP_TENANT_PROFILE),
    "Known deployment profile required",
  );
  const databaseUrl = new URL(process.env.DATABASE_URL);
  databaseUrl.searchParams.set("pgbouncer", "true");
  process.env.DATABASE_URL = databaseUrl.toString();
  const { PrismaService } = require(
    path.join(root, "apps/api/dist/prisma/prisma.service.js"),
  );
  const prisma = new PrismaService(
    new (apiRequire("@nestjs/config").ConfigService)(),
  );
  await prisma.$connect();
  try {
    const sql = fs.readFileSync(
      path.join(root, "migrations/add-action-operator.sql"),
      "utf8",
    );
    await prisma.$transaction(
      async (connection) => {
        await connection.$executeRawUnsafe(
          "DO $operator_setup$ BEGIN\n" + sql + "\nEND $operator_setup$;",
        );
        const tables = await connection.$queryRawUnsafe(
          "SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('mizantra_action_plans','mizantra_action_plan_audit') AND c.relrowsecurity",
        );
        assert.equal(
          tables[0].count,
          2,
          "Operator metadata RLS verification failed",
        );
        const functions = await connection.$queryRawUnsafe(
          "SELECT p.proname,has_function_privilege('service_role',p.oid,'EXECUTE') AS service,has_function_privilege('anon',p.oid,'EXECUTE') AS anonymous,has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('mizantra_operator_create_plan','mizantra_operator_transition','mizantra_operator_commit_pr')",
        );
        assert.equal(functions.length, 3, "Operator RPC verification failed");
        assert(
          functions.every(
            (entry) =>
              entry.service && !entry.anonymous && !entry.authenticated,
          ),
          "Operator RPC access is not service-role only",
        );
        const grants = await connection.$queryRawUnsafe(
          "SELECT has_table_privilege('anon','public.mizantra_action_plans','SELECT') AS anonymous,has_table_privilege('authenticated','public.mizantra_action_plans','SELECT') AS authenticated",
        );
        assert(
          !grants[0].anonymous && !grants[0].authenticated,
          "Direct plan access must remain denied",
        );
      },
      { timeout: 60000 },
    );
    output(
      JSON.stringify({
        profile: process.env.ERP_TENANT_PROFILE,
        metadata_tables: 2,
        rls: true,
        rpc_access: "SERVICE_ROLE_ONLY",
        erp_business_writes: 0,
      }) + "\n",
    );
  } finally {
    await prisma.$disconnect();
  }
})().catch((error) => {
  output(
    JSON.stringify({
      setup_failed: true,
      error_type: error.name,
      message:
        error.name === "AssertionError"
          ? error.message
          : "Trusted Operator metadata setup failed",
    }) + "\n",
  );
  process.exitCode = 1;
});
