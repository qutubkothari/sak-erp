import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

async function verifyProductCategories() {
  try {
    console.log('\n=== Checking SUB_ASSEMBLY items ===');
    
    const { data: subAssemblies, error } = await supabase
      .from('items')
      .select('id, code, name, description, product_category, type')
      .eq('type', 'SUB_ASSEMBLY')
      .eq('tenant_id', tenantId)
      .order('code', { ascending: true });

    if (error) {
      console.error('Error fetching SUB_ASSEMBLY items:', error);
      return;
    }

    console.log(`\nTotal SUB_ASSEMBLY items: ${subAssemblies.length}`);
    
    const withCategory = subAssemblies.filter(item => item.product_category === 'SUB ASSEMBLIES');
    const withoutCategory = subAssemblies.filter(item => item.product_category !== 'SUB ASSEMBLIES');
    
    console.log(`✅ With "SUB ASSEMBLIES": ${withCategory.length}`);
    console.log(`❌ Without "SUB ASSEMBLIES": ${withoutCategory.length}`);
    
    if (withoutCategory.length > 0) {
      console.log('\n=== Items with WRONG or NULL product_category ===');
      withoutCategory.forEach(item => {
        console.log(`  ${item.code} | category: "${item.product_category || 'NULL'}"`);
      });
    }

    console.log('\n=== All unique product_category values ===');
    const { data: allItems, error: error2 } = await supabase
      .from('items')
      .select('product_category')
      .eq('tenant_id', tenantId);
    
    if (error2) {
      console.error('Error fetching all items:', error2);
      return;
    }
    
    const uniqueCategories = [...new Set(allItems.map(i => i.product_category || 'NULL'))];
    uniqueCategories.sort();
    
    console.log('Unique categories found:');
    uniqueCategories.forEach(cat => {
      const count = allItems.filter(i => (i.product_category || 'NULL') === cat).length;
      console.log(`  "${cat}": ${count} items`);
    });

    console.log('\n=== Sample SUB_ASSEMBLY items ===');
    console.log('First 5 items:');
    subAssemblies.slice(0, 5).forEach(item => {
      console.log(`  ${item.code} | "${item.product_category || 'NULL'}" | ${item.name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyProductCategories();
