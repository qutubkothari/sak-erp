const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('apps/api/.env', 'utf-8');
const urlMatch = env.match(/SUPABASE_URL=(.+)/);
const keyMatch = env.match(/SUPABASE_KEY=(.+)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function test() {
  const { data } = await supabase.from('users').select('username, email').ilike('email', '%erpsak53%');
  console.log("erpsak53 users by email:", data);
  const { data: d2 } = await supabase.from('users').select('username, email').ilike('username', '%erpsak53%');
  console.log("erpsak53 users by username:", d2);
}
test();
