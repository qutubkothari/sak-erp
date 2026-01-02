const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://kvfttnibmroxbldmuvvj.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZnR0bmljbXJveGJsZG11dnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5ODQ2ODksImV4cCI6MjA0NzU2MDY4OX0.qrKQVg1oPOOVOa4lpG_cGlPVKLCBigJrXqFaB8XyEj8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    console.log('Checking database structure...');
    
    // Check if tenants table exists
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .limit(1);
    
    if (tenantError) {
      console.log('❌ Tenants table error:', tenantError.message);
      
      // Check what tables exist
      const { data: tables, error: tableError } = await supabase
        .rpc('exec_sql', { 
          sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
        });
      
      if (tableError) {
        console.log('❌ Cannot check tables:', tableError.message);
      } else {
        console.log('Available tables:', tables);
      }
      return;
    }
    
    console.log('✅ Tenants table exists, found tenants:', tenants);
    
    // Enable UUID extension
    const { data: enableExt, error: enableError } = await supabase
      .rpc('exec_sql', { 
        sql: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
      });
    
    if (enableError) {
      console.log('❌ UUID extension enable error:', enableError.message);
    } else {
      console.log('✅ UUID extension enabled');
    }
    
    // Check if HR tables already exist
    const hrTables = ['employees', 'attendance_records', 'leave_requests', 'salary_components', 'payroll_runs', 'payslips'];
    for (const table of hrTables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(0);
      
      if (error) {
        console.log(`❌ ${table} table does not exist:`, error.message);
      } else {
        console.log(`✅ ${table} table exists`);
      }
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkDatabase();