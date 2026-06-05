const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const bcrypt = require('bcryptjs');

async function testPassword() {
  const env = fs.readFileSync('apps/api/.env', 'utf-8');
  const urlMatch = env.match(/SUPABASE_URL=(.+)/);
  const keyMatch = env.match(/SUPABASE_KEY=(.+)/);
  if (urlMatch && keyMatch) {
    const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
    
    // Check user
    const { data: user, error } = await supabase.from('users').select('id, username, password').ilike('username', 'hnoman').maybeSingle();
    console.log("DB User hnoman password:", user ? user.password : error);
    
    if (user && user.password) {
      const isMatch = await bcrypt.compare('Password', user.password);
      console.log("Password match for 'Password':", isMatch);
    }
  }
}
testPassword();
