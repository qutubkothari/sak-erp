const https = require('https');

const SUPABASE_URL = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

async function checkAndCreateTenant() {
  console.log('🔍 Checking for existing tenants...');
  
  try {
    const tenants = await supabaseGet('tenants');
    console.log(`Found ${tenants.length} tenants:`);
    tenants.forEach(t => console.log(`  - ${t.name} (${t.code}) - ID: ${t.id}`));
    
    if (tenants.length > 0) {
      console.log(`\n✅ Using existing tenant: ${tenants[0].name} (${tenants[0].id})`);
      return tenants[0].id;
    }
  } catch (error) {
    console.log(`No tenants found: ${error.message}`);
  }
  
  console.log('\n📝 Creating default tenant...');
  
  const newTenant = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Saif Automations',
    code: 'SAIF',
    is_active: true
  };
  
  try {
    const result = await supabaseInsert('tenants', newTenant);
    console.log(`✅ Tenant created: ${result.name} (${result.id})`);
    return result.id;
  } catch (error) {
    console.error(`❌ Failed to create tenant: ${error.message}`);
    throw error;
  }
}

async function supabaseGet(table) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nwkaruzvzwwuftjquypk.supabase.co',
      port: 443,
      path: `/rest/v1/${table}?select=*`,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function supabaseInsert(table, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'nwkaruzvzwwuftjquypk.supabase.co',
      port: 443,
      path: `/rest/v1/${table}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(body);
            resolve(Array.isArray(result) ? result[0] : result);
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

checkAndCreateTenant()
  .then(tenantId => {
    console.log(`\n✅ Tenant ID to use for import: ${tenantId}`);
    console.log('\nYou can now run: node import-simple.js');
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
