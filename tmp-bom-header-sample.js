const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nwkaruzvzwwuftjquypk.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q');
(async()=>{
  const { data, error } = await supabase.from('bom_headers').select('*').eq('tenant_id','f87a5ab0-0619-4f1c-bab9-e78ca750e56c').limit(1);
  if (error) { console.error(error); process.exit(1); }
  console.log(JSON.stringify(data?.[0] || {}, null, 2));
})();
