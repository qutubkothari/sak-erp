const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://pqfxjdksczjfnfnfisuo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZnhqZGtzY3pqZm5mbmZpc3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTQ4NjQ1MSwiZXhwIjoyMDQ1MDYyNDUxfQ.aKhx-RzAGy6qiNkH4o9NWglTcUyT7zyOwU_JFlzRlOU'
);

async function runMigration() {
  try {
    // Read migration file
    const sql = fs.readFileSync('./migrations/create-hr-payroll.sql', 'utf8');
    
    // Run migration
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Migration failed:', error);
      return;
    }
    
    console.log('✅ HR tables migration completed successfully');
    
    // Check if tables exist
    const { data: tables, error: tableError } = await supabase.rpc('exec_sql', {
      sql: "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND (tablename LIKE '%employee%' OR tablename LIKE '%attendance%' OR tablename LIKE '%leave%' OR tablename LIKE '%payroll%' OR tablename LIKE '%salary%')"
    });
    
    if (!tableError && tables) {
      console.log('HR Tables found:', tables);
    }
    
  } catch (error) {
    console.error('Exception:', error);
  }
}

runMigration();