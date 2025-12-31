const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://kvfttnibmroxbldmuvvj.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZnR0bmljbXJveGJsZG11dnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5ODQ2ODksImV4cCI6MjA0NzU2MDY4OX0.qrKQVg1oPOOVOa4lpG_cGlPVKLCBigJrXqFaB8XyEj8'
);

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...\n');
    
    // Check if key tables exist
    const tableCheckSQL = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tenants', 'employees', 'users', 'items', 'vendors', 'customers')
      ORDER BY table_name;
    `;
    
    const { data: tables, error: tableError } = await supabase.rpc('exec_sql', { sql: tableCheckSQL });
    
    if (tableError) {
      console.log('❌ Error checking tables:', tableError.message);
      return;
    }
    
    console.log('📋 Available tables:', tables?.map(t => t.table_name).join(', ') || 'None found');
    
    // Check tenants table structure if it exists
    const tenantStructureSQL = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tenants' 
      ORDER BY ordinal_position;
    `;
    
    const { data: tenantCols, error: tenantError } = await supabase.rpc('exec_sql', { sql: tenantStructureSQL });
    
    if (!tenantError && tenantCols && tenantCols.length > 0) {
      console.log('\n🏢 TENANTS table structure:');
      tenantCols.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
      
      // Check if there are any tenant records
      const { data: tenantData, error: tenantDataError } = await supabase
        .from('tenants')
        .select('id, name, subdomain')
        .limit(5);
      
      if (!tenantDataError && tenantData) {
        console.log('\n📊 Existing tenant records:');
        tenantData.forEach(tenant => {
          console.log(`  - ${tenant.name} (${tenant.subdomain}) - ID: ${tenant.id}`);
        });
      }
    } else {
      console.log('\n❌ TENANTS table does not exist');
    }
    
    // Check employees table structure if it exists
    const empStructureSQL = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'employees' 
      ORDER BY ordinal_position;
    `;
    
    const { data: empCols, error: empError } = await supabase.rpc('exec_sql', { sql: empStructureSQL });
    
    if (!empError && empCols && empCols.length > 0) {
      console.log('\n👥 EMPLOYEES table already exists with structure:');
      empCols.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } else {
      console.log('\n✅ EMPLOYEES table does not exist (ready for creation)');
    }
    
    // Check UUID extension
    const uuidCheckSQL = `SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') as has_uuid_extension;`;
    const { data: uuidCheck, error: uuidError } = await supabase.rpc('exec_sql', { sql: uuidCheckSQL });
    
    if (!uuidError && uuidCheck) {
      console.log(`\n🔧 UUID Extension: ${uuidCheck[0].has_uuid_extension ? '✅ Enabled' : '❌ Missing'}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 DIAGNOSIS:');
    
    if (!tenantCols || tenantCols.length === 0) {
      console.log('❌ TENANTS table is missing - this is the root cause!');
      console.log('✅ SOLUTION: Run the create-hr-tables-fixed.sql script');
      console.log('   It will create the tenants table first, then HR tables');
    } else {
      console.log('✅ TENANTS table exists');
      if (empCols && empCols.length > 0) {
        console.log('⚠️  EMPLOYEES table already exists - may need to be dropped first');
      } else {
        console.log('✅ Ready to create HR tables');
      }
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }
}

checkSchema();