/**
 * Check exact item names for Kangaroo assemblies
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKangarooItems() {
  console.log('\n============================================================');
  console.log('CHECKING KANGAROO ITEMS IN DATABASE');
  console.log('============================================================\n');

  const { data: items, error } = await supabase
    .from('items')
    .select('code, name, type')
    .eq('tenant_id', tenantId)
    .ilike('name', '%kangaroo%')
    .order('name');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${items.length} items with "kangaroo" in name:\n`);

  items.forEach((item, idx) => {
    console.log(`${idx + 1}. "${item.name}"`);
    console.log(`   Code: ${item.code}`);
    console.log(`   Type: ${item.type}\n`);
  });

  // Check what the sheet names become after processing
  const sheetNames = [
    "25-Kangaroo box STBD Assy",
    "24-Kangaroo box PORT Assy",
    "23-Kangaroo Box Preprocessing A",
    "22-Kangaroo Power Wire STBD Ass",
    "21-Kangaroo Power Wire PORT Ass"
  ];

  console.log('\n============================================================');
  console.log('SHEET NAME PROCESSING');
  console.log('============================================================\n');

  sheetNames.forEach(sheetName => {
    const processedName = sheetName.replace(/^\d+-/, '').trim();
    console.log(`Sheet: "${sheetName}"`);
    console.log(`  → Processed: "${processedName}"`);
    
    // Check for matches
    const matches = items.filter(item => 
      item.name.toUpperCase().includes(processedName.toUpperCase()) ||
      processedName.toUpperCase().includes(item.name.toUpperCase())
    );
    
    if (matches.length > 0) {
      console.log(`  ✅ Matches:`);
      matches.forEach(m => console.log(`     - ${m.name} (${m.code})`));
    } else {
      console.log(`  ❌ No matches found`);
    }
    console.log('');
  });

  console.log('============================================================\n');
}

checkKangarooItems();
