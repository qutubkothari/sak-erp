// Quick test to check HR tables in database
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pfjswqmwvvznrqudoyjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmanN3cW13dnZ6bnJxdWRveWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyODczODMsImV4cCI6MjA0Nzg2MzM4M30.TgGXLqHnQs9TBMRxB1oZznwXH7EMNFiZCRt5BPM1cBU'
);

async function testHRTables() {
  console.log('🔍 Testing HR Module Database Tables...\n');

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
}

testHRTables().then(() => process.exit(0)).catch(console.error);
