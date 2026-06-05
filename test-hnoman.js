const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testHnoman() {
  console.log("1. Testing API Login...");
  try {
    const res = await fetch('https://pms.saksolution.com/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hnoman', password: 'Password' })
    });
    const text = await res.text();
    console.log("API Login Result:", res.status, text);
  } catch (e) {
    console.error("API Error:", e.message);
  }

  console.log("\n2. Testing DB Directly...");
  const env = fs.readFileSync('apps/api/.env', 'utf-8');
  const urlMatch = env.match(/SUPABASE_URL=(.+)/);
  const keyMatch = env.match(/SUPABASE_KEY=(.+)/);
  if (urlMatch && keyMatch) {
    const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
    
    // Check user
    const { data: user, error } = await supabase.from('users').select('id, username, email, tenant_id, is_active').ilike('username', 'hnoman').maybeSingle();
    console.log("DB User hnoman:", error ? error.message : user);
    
    if (user) {
      // Check tenant
      const { data: tenant, error: tErr } = await supabase.from('tenants').select('id, name, is_active').eq('id', user.tenant_id).maybeSingle();
      console.log("User's Tenant:", tErr ? tErr.message : tenant);
    }
  }
}
testHnoman();
