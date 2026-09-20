/*
  Apply a .sql file using Supabase RPC function exec_sql.

  Usage:
    node scripts/apply-sql-supabase.js migrations/add-pr-line-commercial-terms.sql

  Requirements:
  - apps/api/.env contains SUPABASE_URL and SUPABASE_KEY (service role key required)
  - Database has an RPC function named exec_sql(sql text)

  Notes:
  - Does NOT print secrets.
*/

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY in apps/api/.env');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const payloadsToTry = [
      { sql },
      { query: sql },
      { statement: sql },
      { sql_query: sql },
      { p_sql: sql },
    ];

    let lastError = null;

    for (const payload of payloadsToTry) {
      // eslint-disable-next-line no-await-in-loop
      const { error } = await supabase.rpc('exec_sql', payload);
      if (!error) {
        console.log(
          `✅ Applied SQL successfully via exec_sql: ${path.relative(process.cwd(), sqlPath)}`
        );
        return;
      }
      lastError = error;
    }

    console.error(
      `❌ Failed applying SQL via exec_sql (tried keys: ${payloadsToTry
        .map((p) => Object.keys(p)[0])
        .join(', ')}): ${lastError?.message || JSON.stringify(lastError)}`
    );
    process.exit(1);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error(`❌ Exception applying SQL via exec_sql: ${message}`);
    process.exit(1);
  }
}

main();
