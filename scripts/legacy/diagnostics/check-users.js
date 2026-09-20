/**
 * Check user accounts and their tenant associations
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('\n============================================================');
  console.log('CHECKING USER ACCOUNTS AND TENANT ASSOCIATIONS');
  console.log('============================================================\n');

  try {
    // Check auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
    } else {
      console.log('📧 Auth Users (auth.users):');
      console.log('─────────────────────────────────────────────────────────');
      authUsers.users.forEach(user => {
        console.log(`  ${user.email}`);
        console.log(`     ID: ${user.id}`);
        console.log(`     Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`     Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
        console.log(`     Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}\n`);
      });
    }

    // Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users table:', usersError.message);
    } else {
      console.log('\n👥 Users Table (public.users):');
      console.log('─────────────────────────────────────────────────────────');
      if (users.length === 0) {
        console.log('  ⚠️  No users found in public.users table\n');
      } else {
        users.forEach(user => {
          console.log(`  ${user.email}`);
          console.log(`     User ID: ${user.id}`);
          console.log(`     Name: ${user.first_name} ${user.last_name}`);
          console.log(`     Tenant ID: ${user.tenant_id}`);
          console.log(`     Active: ${user.is_active}`);
          console.log(`     Created: ${new Date(user.created_at).toLocaleString()}\n`);
        });
      }
    }

    // Check user_tenants association table
    const { data: userTenants, error: utError } = await supabase
      .from('user_tenants')
      .select(`
        *,
        users(email, first_name, last_name),
        tenants(name, code)
      `)
      .order('created_at', { ascending: false });

    if (utError) {
      console.error('❌ Error fetching user-tenant associations:', utError.message);
    } else {
      console.log('\n🔗 User-Tenant Associations (user_tenants):');
      console.log('─────────────────────────────────────────────────────────');
      if (userTenants.length === 0) {
        console.log('  ⚠️  No user-tenant associations found\n');
      } else {
        userTenants.forEach(ut => {
          console.log(`  ${ut.users?.email || 'Unknown'} → ${ut.tenants?.name || 'Unknown'} (${ut.tenants?.code || 'N/A'})`);
          console.log(`     User ID: ${ut.user_id}`);
          console.log(`     Tenant ID: ${ut.tenant_id}`);
          console.log(`     Role: ${ut.role || 'N/A'}`);
          console.log(`     Active: ${ut.is_active}\n`);
        });
      }
    }

    // Check tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (tenantsError) {
      console.error('❌ Error fetching tenants:', tenantsError.message);
    } else {
      console.log('\n🏢 Tenants:');
      console.log('─────────────────────────────────────────────────────────');
      tenants.forEach(tenant => {
        console.log(`  ${tenant.name} (${tenant.code})`);
        console.log(`     Tenant ID: ${tenant.id}`);
        console.log(`     Active: ${tenant.is_active}`);
        console.log(`     Created: ${new Date(tenant.created_at).toLocaleString()}\n`);
      });
    }

    // Specific users check
    console.log('\n🔍 Specific User Check:');
    console.log('─────────────────────────────────────────────────────────');
    
    const targetUsers = ['hnoman@saksolution.com', 'taher@saifautomations.com'];
    
    for (const email of targetUsers) {
      const { data: authUser } = await supabase.auth.admin.listUsers();
      const foundAuthUser = authUser?.users.find(u => u.email === email);
      
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('*, tenants(name, code)')
        .eq('user_id', foundAuthUser?.id || user?.id)
        .maybeSingle();

      console.log(`\n  📧 ${email}`);
      console.log(`     Auth User: ${foundAuthUser ? '✅ Exists' : '❌ Not Found'}`);
      console.log(`     Public User: ${user ? '✅ Exists' : '❌ Not Found'}`);
      if (user) {
        console.log(`     User Tenant ID: ${user.tenant_id}`);
      }
      if (userTenant) {
        console.log(`     Tenant Association: ${userTenant.tenants?.name} (${userTenant.tenants?.code})`);
        console.log(`     Role: ${userTenant.role || 'N/A'}`);
      } else {
        console.log(`     Tenant Association: ❌ None`);
      }
    }

    console.log('\n============================================================\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkUsers();
