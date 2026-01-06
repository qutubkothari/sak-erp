/*
  Apply a .sql file to the Postgres database configured in apps/api/.env.

  Usage:
    node scripts/apply-sql.js migrations/add-pr-line-commercial-terms.sql

  Notes:
  - Does NOT print connection strings or secrets.
  - Uses DIRECT_URL (preferred) or DATABASE_URL.
*/

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '..', 'apps', 'api', '.env') });

async function main() {
  const sqlPathArg = process.argv[2] || path.join('migrations', 'add-pr-line-commercial-terms.sql');
  const sqlPath = path.isAbsolute(sqlPathArg)
    ? sqlPathArg
    : path.resolve(process.cwd(), sqlPathArg);

  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Missing DIRECT_URL or DATABASE_URL in apps/api/.env');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query(sql);
    console.log(`✅ Applied SQL successfully: ${path.relative(process.cwd(), sqlPath)}`);
  } catch (err) {
    const safeMessage = err && err.message ? err.message : String(err);
    console.error(`❌ Failed applying SQL: ${safeMessage}`);

    // Print nested causes for modern Node/pg connection failures (often AggregateError)
    if (err && Array.isArray(err.errors) && err.errors.length > 0) {
      console.error('Details:');
      err.errors.forEach((inner, idx) => {
        const msg = inner && inner.message ? inner.message : String(inner);
        console.error(`  [${idx + 1}] ${msg}`);
      });
    } else {
      // Common pg error fields
      const code = err && err.code ? err.code : null;
      const detail = err && err.detail ? err.detail : null;
      const hint = err && err.hint ? err.hint : null;
      if (code || detail || hint) {
        console.error('Details:');
        if (code) console.error(`  code: ${code}`);
        if (detail) console.error(`  detail: ${detail}`);
        if (hint) console.error(`  hint: ${hint}`);
      }
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
