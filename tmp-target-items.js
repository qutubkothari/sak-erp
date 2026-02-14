const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nwkaruzvzwwuftjquypk.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q');
const TENANT_ID='f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
const CODES=['HARDOWOODPACKING','FAB-3DP-QX7-LCD-HOLD','JETUNITSIGNALCAB','FAB-3DP-X16-EXT-PILLER','CRAFTBATTERYHOLD'];
(async()=>{
  const { data } = await supabase.from('items').select('id,code,name,type').eq('tenant_id',TENANT_ID).in('code',CODES);
  console.log(JSON.stringify(data,null,2));
})();
