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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function checkBomData() {
  console.log('='.repeat(80));
  console.log('CHECKING BOM DATA');
  console.log('='.repeat(80));
  
  // Get a sample BOM
  const boms = await supabaseGet('bom_headers', 'select=*&limit=1');
  
  if (boms.length === 0) {
    console.log('❌ No BOMs found');
    return;
  }
  
  const sampleBom = boms[0];
  console.log(`\n📦 Sample BOM ID: ${sampleBom.id}`);
  console.log(`   Item ID: ${sampleBom.item_id}`);
  console.log(`   Version: ${sampleBom.version}`);
  
  // Get the item for this BOM
  const item = await supabaseGet('items', `select=*&id=eq.${sampleBom.item_id}`);
  console.log(`\n🔍 Parent Item: ${item[0]?.name || 'NOT FOUND'}`);
  console.log(`   Code: ${item[0]?.code}`);
  console.log(`   Type: ${item[0]?.type}`);
  
  // Get BOM items
  const bomItems = await supabaseGet('bom_items', `select=*&bom_id=eq.${sampleBom.id}`);
  console.log(`\n📋 BOM Items: ${bomItems.length} components`);
  
  if (bomItems.length > 0) {
    console.log('\nFirst 5 components:');
    for (let i = 0; i < Math.min(5, bomItems.length); i++) {
      const bomItem = bomItems[i];
      const component = await supabaseGet('items', `select=code,name&id=eq.${bomItem.item_id}`);
      console.log(`   ${i+1}. ${component[0]?.name || 'ITEM NOT FOUND'}`);
      console.log(`      Code: ${component[0]?.code || 'N/A'}`);
      console.log(`      Quantity: ${bomItem.quantity}`);
      console.log(`      Item ID exists: ${bomItem.item_id ? 'YES' : 'NO'}`);
    }
  }
  
  // Check if there are any orphaned bom_items
  const allBomItems = await supabaseGet('bom_items', 'select=item_id');
  const itemIds = [...new Set(allBomItems.map(bi => bi.item_id))];
  
  console.log(`\n🔗 Checking ${itemIds.length} unique component IDs...`);
  let missing = 0;
  for (const itemId of itemIds) {
    const exists = await supabaseGet('items', `select=id&id=eq.${itemId}`);
    if (exists.length === 0) {
      missing++;
    }
  }
  
  if (missing > 0) {
    console.log(`❌ ${missing} component items are missing from items table!`);
  } else {
    console.log(`✅ All component items exist`);
  }
  
  console.log('\n' + '='.repeat(80));
}

checkBomData().catch(console.error);
