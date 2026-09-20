const https = require('https');

const SUPABASE_URL = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

async function supabaseGet(table, params = '') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nwkaruzvzwwuftjquypk.supabase.co',
      port: 443,
      path: `/rest/v1/${table}?${params}`,
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
        console.log(`Query: ${table}?${params}`);
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const result = JSON.parse(body);
          console.log(`Result: ${JSON.stringify(result).substring(0, 200)}...`);
          resolve(result);
        } else {
          console.log(`Error: ${body}`);
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testQueries() {
  console.log('='.repeat(80));
  console.log('TESTING FRONTEND-STYLE QUERIES');
  console.log('='.repeat(80));
  
  try {
    // Query 1: Get BOMs with item info (typical list view)
    console.log('\n1️⃣ Get BOMs with parent item info:');
    const bomsWithItems = await supabaseGet('bom_headers', 
      'select=id,version,is_active,item_id,items(id,code,name,type)&limit=3');
    
    // Query 2: Get specific BOM with nested items (typical detail view)
    const bomId = bomsWithItems[0].id;
    console.log(`\n2️⃣ Get BOM details with components (BOM ID: ${bomId}):`);
    const bomDetail = await supabaseGet('bom_headers',
      `select=*,items(code,name,type),bom_items!bom_items_bom_id_fkey(id,quantity,notes,items(id,code,name,type,category,uom))&id=eq.${bomId}`);
    
    console.log(`\n✅ Query successful! BOM has ${bomDetail[0]?.bom_items?.length || 0} items`);
    
  } catch (error) {
    console.error('\n❌ Query failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
}

testQueries().catch(console.error);
