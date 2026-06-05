const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('apps/api/.env', 'utf-8');
const urlMatch = env.match(/SUPABASE_URL=(.+)/);
const keyMatch = env.match(/SUPABASE_KEY=(.+)/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
  
  async function test() {
    const { data, error } = await supabase.from('users').select('username, email, tenant_id').ilike('username', '%qutub%');
    console.log("Qutub users:", data);
    
    const { data: d2 } = await supabase.from('users').select('username, email, tenant_id').ilike('username', '%admin%');
    console.log("Admin users:", d2);
    
    const { data: d3 } = await supabase.from('users').select('username, email, tenant_id, is_active').limit(10);
    console.log("First 10 users:", d3);
  }
  test();
}
