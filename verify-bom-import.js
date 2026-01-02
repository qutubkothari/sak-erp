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
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Invalid JSON'));
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

async function checkImport() {
  console.log('='.repeat(80));
  console.log('BOM IMPORT VERIFICATION');
  console.log('='.repeat(80));
  
  // Count items by type
  const items = await supabaseGet('items', 'select=type');
  const itemsByType = items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\nItems by Type:');
  Object.entries(itemsByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log(`  TOTAL: ${items.length}`);
  
  // Count BOMs
  const boms = await supabaseGet('bom_headers', 'select=id');
  console.log(`\nBOM Headers: ${boms.length}`);
  
  // Count BOM Items
  const bomItems = await supabaseGet('bom_items', 'select=id');
  console.log(`BOM Items: ${bomItems.length}`);
  
  // Get sample BOM with items
  if (boms.length > 0) {
    const sampleBom = await supabaseGet('bom_headers', 'select=*,items!bom_headers_item_id_fkey(code,name)&limit=1');
    const bomWithItems = await supabaseGet('bom_items', `select=*,items!bom_items_item_id_fkey(code,name)&bom_id=eq.${sampleBom[0].id}`);
    
    console.log(`\n📦 Sample BOM: ${sampleBom[0].items.name} (${sampleBom[0].items.code})`);
    console.log(`   Components: ${bomWithItems.length}`);
    bomWithItems.slice(0, 5).forEach(item => {
      console.log(`   - ${item.items.name} (${item.quantity})`);
    });
    if (bomWithItems.length > 5) {
      console.log(`   ... and ${bomWithItems.length - 5} more`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Import verification complete!');
  console.log('='.repeat(80));
}

checkImport().catch(console.error);
