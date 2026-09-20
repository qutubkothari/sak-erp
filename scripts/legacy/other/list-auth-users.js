/**
 * List all auth users to find conflicts
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAuthUsers() {
  console.log('\n📧 Fetching all auth users...\n');
  
  let page = 1;
  let users = [];
  let hasMore =true;
  
  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100
    });
    
    if (error) {
      console.error('Error:', error);
      break;
    }
    
    users = users.concat(data.users);
    hasMore = data.users.length === 100;
    page++;
  }
  
  console.log(`Found ${users.length} auth users:\n`);
  
  const targetEmails = ['hnoman@saksolution.com', 'taher@saifautomations.com'];
  
  users.forEach(user => {
    const isTarget = targetEmails.includes(user.email);
    if (isTarget || users.length < 50) {
      console.log(`${isTarget ? '🎯' : '  '} ${user.email}`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`     Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log('');
    }
  });
  
  console.log('\n🎯 Target users:');
  targetEmails.forEach(email => {
    const found = users.find(u => u.email === email);
    if (found) {
      console.log(`✅ ${email} - ID: ${found.id}`);
    } else {
      console.log(`❌ ${email} - Not found in auth.users`);
    }
  });
}

listAuthUsers();
