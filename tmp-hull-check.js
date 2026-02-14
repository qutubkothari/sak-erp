const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nwkaruzvzwwuftjquypk.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q');
const TENANT_ID='f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
(async()=>{
  const { data: items } = await supabase.from('items').select('id,code,name,type,product_category').eq('tenant_id',TENANT_ID).ilike('code','HULLPREPROCESSAS');
  if(!items?.length){ console.log('HULLPREPROCESSAS item not found'); return; }
  const item = items[0];
  const { data: boms } = await supabase.from('bom_headers').select('id,version,is_active,item_id').eq('tenant_id',TENANT_ID).eq('item_id',item.id);
  const bomIds = (boms||[]).map(b=>b.id);
  let totalComponents = 0;
  if(bomIds.length){
    const { data: bomItems } = await supabase.from('bom_items').select('id,bom_id,item_id,child_bom_id,quantity').in('bom_id', bomIds);
    totalComponents = bomItems?.length || 0;
  }
  const { data: stockRows } = await supabase.from('inventory').select('qty').eq('tenant_id',TENANT_ID).eq('item_id',item.id);
  const stock = (stockRows||[]).reduce((s,r)=>s+Number(r.qty||0),0);
  console.log(JSON.stringify({ item, bomCount: boms?.length||0, boms, totalComponents, inventoryQty: stock }, null, 2));
})();
