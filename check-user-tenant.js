const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwkaruzvzwwuftjquypk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q'
);

async function checkUser() {
  try {
    console.log('\n=== Checking user and tenant ===\n');
    
    const email = 'hnoman@saksolution.com';
    console.log('Email:', email);
    
    // Check app users table directly
    console.log('\nChecking users table...');
    const { data: appUser, error: appUserError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);
    
    if (appUserError) {
      console.error('Error:', appUserError.message);
      throw appUserError;
    }
    
    console.log('Found users:', appUser?.length || 0);
    
    if (!appUser || appUser.length === 0) {
      console.log('❌ User not found in users table!');
      return;
    }
    
    for (const user of appUser) {
      console.log('\n--- User Record ---');
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      console.log('Tenant ID:', user.tenant_id);
      console.log('Role:', user.role);
      console.log('Name:', user.name);
      
      // Get this tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', user.tenant_id)
        .single();
      
      if (!tenantError && tenant) {
        console.log('\n--- Tenant Info ---');
        console.log('Tenant Name:', tenant.name);
        console.log('Tenant ID:', tenant.id);
        
        // Count vendors
        const { count } = await supabase
          .from('vendors')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.tenant_id);
        
        console.log('Vendors in tenant:', count || 0);
        
        if (count > 0) {
          console.log('✅ This tenant HAS vendors!');
        } else {
          console.log('❌ This tenant has NO vendors!');
        }
      }
    }
    
    console.log('\n');
  } catch (err) {
    console.error('ERROR:', err.message || err);
    throw err;
  }
}

checkUser()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
