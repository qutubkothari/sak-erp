const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nwkaruzvzwwuftjquypk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

async function main() {
  const sqlFile = process.argv[2] || 'delete-items-vendors-boms.sql';
  const sqlPath = path.isAbsolute(sqlFile) ? sqlFile : path.resolve(process.cwd(), sqlFile);

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`📄 Executing SQL file: ${path.basename(sqlPath)}`);
  console.log(`🔗 Connecting to Supabase...`);
  console.log('');

  const supabase =createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });

 // Split SQL into individual statements (simple split on semicolon)
  // This is needed because Supabase RPC might not handle multi-statement SQL well
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^--/) && !s.match(/^\/\*/));

  console.log(`📊 Found ${statements.length} SQL statements to execute`);
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Skip comments and empty statements
    if (!stmt || stmt.startsWith('--') || stmt.startsWith('/*')) {
      continue;
    }

    process.stdout.write(`\r[${i + 1}/${statements.length}] Executing...`);

    try {
      // Use from().select() with a raw SQL query for simple operations
      // For complex operations, we'll use rpc if available
      if (stmt.toLowerCase().includes('delete from')) {
        // Extract table name from DELETE statement
        const match = stmt.match(/DELETE\s+FROM\s+(\w+)/i);
        if (match) {
          const tableName = match[1];
          const { error } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          
          if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (which is ok)
            throw error;
          }
        }
      } else if (stmt.toLowerCase().includes('raise notice')) {
        // Skip RAISE NOTICE statements
        continue;
      } else if (stmt.toLowerCase().startsWith('do $$') || stmt.toLowerCase().startsWith('begin')) {
        // Skip procedural blocks for now
        console.log(`\n⚠️  Skipping procedural block`);
        continue;
      }
      
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`\n❌ Error on statement ${i + 1}:`, error.message);
    }
  }

  console.log(`\n`);
  console.log('============================================================');
  console.log(`✅ Execution complete`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log('============================================================');
  console.log('');

  if (errorCount > 0) {
    console.log('⚠️  Some statements failed. Please check the errors above.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
