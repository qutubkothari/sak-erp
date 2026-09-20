// Test and create HR tables using Supabase exec_sql
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Try to use environment variables first, fallback to known working ones
const supabaseUrl = process.env.SUPABASE_URL || 'https://kvfttnibmroxbldmuvvj.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZnR0bmljbXJveGJsZG11dnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5ODQ2ODksImV4cCI6MjA0NzU2MDY4OX0.qrKQVg1oPOOVOa4lpG_cGlPVKLCBigJrXqFaB8XyEj8';

console.log('Using Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function createHRTables() {
  try {
    console.log('🚀 Creating HR Tables...\n');

    // Read the SQL file
    const sqlContent = fs.readFileSync('create-hr-tables.sql', 'utf8');
    
    console.log('📝 Executing SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: sqlContent 
    });
    
    if (error) {
      console.error('❌ Error creating HR tables:', error);
      console.error('   Details:', error.message);
      console.error('   Hint:', error.hint);
      return;
    }
    
    console.log('✅ HR tables created successfully!');
    console.log('📊 Result:', data);
    
    // Now test if tables exist
    console.log('\n🔍 Testing HR Tables...');
    const tables = [
      'employees',
      'attendance_records', 
      'leave_requests',
      'salary_components',
      'payroll_runs',
      'payslips'
    ];

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table}: Does NOT exist - ${error.message}`);
        } else {
          console.log(`✅ ${table}: EXISTS (${count || 0} records)`);
        }
      } catch (err) {
        console.log(`❌ ${table}: Error - ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to create HR tables:', error.message);
  }
}

createHRTables().then(() => process.exit(0)).catch(console.error);