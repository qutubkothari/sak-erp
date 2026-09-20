/**
 * List all imported BOMs
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listBOMs() {
  console.log('\n📋 All BOMs in database:\n');

  const { data: boms, error } = await supabase
    .from('bom_headers')
    .select('id, item_id, version, is_active')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${boms.length} BOMs:\n`);
  
  for (const bom of boms) {
    const { data: item } = await supabase
      .from('items')
      .select('code, name, type')
      .eq('id', bom.item_id)
      .single();

    console.log(`• ${item?.code || 'Unknown'} - ${item?.name || 'Unknown'}`);
    console.log(`  Type: ${item?.type}, Active: ${bom.is_active}, Version: ${bom.version}\n`);
  }
}

listBOMs();
