const https = require('https');

const SUPABASE_URL = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const TENANT_ID = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

async function supabaseDelete(table, filter) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nwkaruzvzwwuftjquypk.supabase.co',
      port: 443,
      path: `/rest/v1/${table}?${filter}`,
      method: 'DELETE',
      headers: {
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
            const result = body ? JSON.parse(body) : [];
            resolve(Array.isArray(result) ? result : [result]);
          } catch (e) {
            resolve([]);
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

async function clearItems() {
  console.log('='.repeat(80));
  console.log('CLEARING ALL ITEMS');
  console.log('='.repeat(80));
  
  try {
    console.log('\n🗑️  Deleting production job orders first...');
    const jobOrders = await supabaseDelete('production_job_orders', 'id=neq.00000000-0000-0000-0000-000000000000');
    console.log(`✅ Deleted ${jobOrders.length} job orders`);
    
    console.log('\n🗑️  Deleting BOM items...');
    const bomItems = await supabaseDelete('bom_items', 'id=neq.00000000-0000-0000-0000-000000000000');
    console.log(`✅ Deleted ${bomItems.length} BOM items`);
    
    console.log('\n🗑️  Deleting BOM headers...');
    const boms = await supabaseDelete('bom_headers', 'id=neq.00000000-0000-0000-0000-000000000000');
    console.log(`✅ Deleted ${boms.length} BOM headers`);
    
    console.log('\n🗑️  Deleting all items...');
    const items = await supabaseDelete('items', `tenant_id=eq.${TENANT_ID}`);
    console.log(`✅ Deleted ${items.length} items`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ All items cleared successfully!');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

clearItems();
