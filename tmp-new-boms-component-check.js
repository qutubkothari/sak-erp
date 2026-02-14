const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nwkaruzvzwwuftjquypk.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q');
const TENANT_ID='f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
const CODES=['HARDOWOODPACKING','FAB-3DP-QX7-LCD-HOLD','JETUNITSIGNALCAB','FAB-3DP-X16-EXT-PILLER','CRAFTBATTERYHOLD'];
(async()=>{
  const { data: items } = await supabase.from('items').select('id,code,name').eq('tenant_id',TENANT_ID).in('code',CODES);
  const out=[];
  for(const it of (items||[])){
    const { data: boms } = await supabase.from('bom_headers').select('id,version,is_active,created_at').eq('tenant_id',TENANT_ID).eq('item_id',it.id).order('created_at',{ascending:false});
    const bomIds=(boms||[]).map(b=>b.id);
    let itemRows=0;
    if(bomIds.length){
      const { count } = await supabase.from('bom_items').select('id',{count:'exact',head:true}).in('bom_id',bomIds);
      itemRows = count || 0;
    }
    out.push({code:it.code,name:it.name,bomCount:boms?.length||0,latestBomId:boms?.[0]?.id||null,componentRows:itemRows});
  }
  out.sort((a,b)=>a.code.localeCompare(b.code));
  console.log(JSON.stringify(out,null,2));
})();
