/**
 * Check users table schema
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  // Get a sample user to see the fields
  const { data: sampleUser } = await supabase
    .from('users')
    .select('*')
    .limit(1)
    .single();

  console.log('\nSample user record:');
  console.log(JSON.stringify(sampleUser, null, 2));

  // Try to get column info via information_schema
  const { data, error } = await supabase
    .rpc('get_table_columns', { table_name: 'users' });

  if (error) {
    console.log('\nCould not get schema via RPC, trying raw query...');
  } else {
    console.log('\nTable columns:');
    console.log(data);
  }
}

checkSchema();
