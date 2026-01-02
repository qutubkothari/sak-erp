const https = require('https');

const SUPABASE_URL = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

async function supabasePatch(table, filter, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'nwkaruzvzwwuftjquypk.supabase.co',
      port: 443,
      path: `/rest/v1/${table}?${filter}`,
      method: 'PATCH',
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
    req.write(postData);
    req.end();
  });
}

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

async function updateVendors() {
  console.log('='.repeat(80));
  console.log('UPDATING VENDOR CATEGORY AND TERMS');
  console.log('='.repeat(80));
  
  const vendors = await supabaseGet('vendors', 'select=id,name,code');
  console.log(`\nFound ${vendors.length} vendors to update`);
  
  let updated = 0;
  
  for (const vendor of vendors) {
    try {
      const updates = {
        category: 'RAW_MATERIAL',
        payment_terms: 'Net 30 Days'
      };
      
      await supabasePatch('vendors', `id=eq.${vendor.id}`, updates);
      updated++;
      
      if (updated % 10 === 0) {
        console.log(`  ${updated}/${vendors.length} vendors updated...`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${vendor.name}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ ${updated}/${vendors.length} vendors updated`);
  console.log('='.repeat(80));
}

updateVendors().catch(console.error);
