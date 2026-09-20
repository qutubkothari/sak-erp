const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('apps/api/.env', 'utf-8');
const urlMatch = env.match(/SUPABASE_URL=(.+)/);
const keyMatch = env.match(/SUPABASE_KEY=(.+)/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
  
  async function test() {
    const { data, error } = await supabase.from('users').select('username, email, tenant_id').limit(5);
    console.log("DB Test:", error ? error.message : data);
    
    const { data: tenant, error: tErr } = await supabase.from('tenants').select('id, name, is_active');
    console.log("Tenants:", tErr ? tErr.message : tenant);
  }
  test();
} else {
  console.log("Could not find keys");
}
