const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('apps/api/.env', 'utf-8');
const urlMatch = env.match(/SUPABASE_URL=(.+)/);
const keyMatch = env.match(/SUPABASE_KEY=(.+)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function test() {
  const { data } = await supabase.from('users').select('username, email, is_active').ilike('email', '%kothariqutub%');
  console.log("kothari users:", data);
  const { data: d2 } = await supabase.from('users').select('username, email, is_active').ilike('username', '%kothari%');
  console.log("kothari username:", d2);
  const { data: d3 } = await supabase.from('users').select('username, email, is_active').ilike('email', '%saksolution%');
  console.log("sak users:", d3);
}
test();
