/**
 * Fix user authentication and tenant issues
 * - Create auth users for hnoman@saksolution.com and taher@saifautomations.com
 * - Ensure both are in the same tenant (f87a5ab0-0619-4f1c-bab9-e78ca750e56c)
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const targetTenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

const users = [
  {
    email: 'hnoman@saksolution.com',
    password: 'TempPass123!', // User should change this on first login
    firstName: 'Husein',
    lastName: 'Noman'
  },
  {
    email: 'taher@saifautomations.com',
    password: 'TempPass123!', // User should change this on first login
    firstName: 'Taher',
    lastName: ''
  }
];

async function fixUsers() {
  console.log('\n============================================================');
  console.log('FIXING USER AUTHENTICATION AND TENANT ISSUES');
  console.log('============================================================\n');
  console.log(`Target Tenant: SAK Solutions (${targetTenantId})\n`);

  for (const userData of users) {
    console.log(`\n📧 Processing: ${userData.email}`);
    console.log('─────────────────────────────────────────────────────────');

    try {
      // Check if user exists in public.users
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userData.email)
        .maybeSingle();

      if (checkError) {
        console.error(`  ❌ Error checking existing user: ${checkError.message}`);
        continue;
      }

      let authUserId;

      // Create or update auth user
      if (existingUser) {
        console.log(`  ✅ User exists in public.users table (ID: ${existingUser.id})`);
        authUserId = existingUser.id;

        // Check if they have auth credentials
        const { data: authCheck } = await supabase.auth.admin.getUserById(existingUser.id);
        
        if (!authCheck.user) {
          console.log(`  ⚠️  No auth credentials found - creating...`);
          
          // Create auth user with the existing user ID
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
            user_metadata: {
              first_name: userData.firstName,
              last_name: userData.lastName
            }
          });

          if (authError) {
            console.error(`  ❌ Error creating auth user: ${authError.message}`);
            continue;
          }

          authUserId = authUser.user.id;
          console.log(`  ✅ Created auth user (ID: ${authUserId})`);
          console.log(`  🔑 Temporary password: ${userData.password}`);
          
          // Update the users table with the new auth user ID if different
          if (authUserId !== existingUser.id) {
            const { error: updateIdError } = await supabase
              .from('users')
              .update({ id: authUserId })
              .eq('id', existingUser.id);
              
            if (updateIdError) {
              console.error(`  ⚠️  Could not update user ID: ${updateIdError.message}`);
            }
          }
        } else {
          console.log(`  ✅ Auth credentials already exist`);
        }

        // Update tenant if needed
        if (existingUser.tenant_id !== targetTenantId) {
          console.log(`  🔄 Updating tenant from ${existingUser.tenant_id} to ${targetTenantId}`);
          const { error: updateError } = await supabase
            .from('users')
            .update({ tenant_id: targetTenantId })
            .eq('id', authUserId);

          if (updateError) {
            console.error(`  ❌ Error updating tenant: ${updateError.message}`);
          } else {
            console.log(`  ✅ Tenant updated successfully`);
          }
        } else {
          console.log(`  ✅ Already in correct tenant`);
        }

      } else {
        // Create new auth user
        console.log(`  ➕ Creating new user...`);
        
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            first_name: userData.firstName,
            last_name: userData.lastName
          }
        });

        if (authError) {
          console.error(`  ❌ Error creating auth user: ${authError.message}`);
          continue;
        }

        authUserId = authUser.user.id;
        console.log(`  ✅ Created auth user (ID: ${authUserId})`);
        console.log(`  🔑 Temporary password: ${userData.password}`);

        // Create user in public.users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authUserId,
            email: userData.email,
            first_name: userData.firstName,
            last_name: userData.lastName,
            tenant_id: targetTenantId,
            is_active: true
          });

        if (userError) {
          console.error(`  ❌ Error creating public user: ${userError.message}`);
        } else {
          console.log(`  ✅ Created public user record`);
        }
      }

    } catch (err) {
      console.error(`  ❌ Unexpected error: ${err.message}`);
    }
  }

  // Final verification
  console.log('\n\n============================================================');
  console.log('VERIFICATION');
  console.log('============================================================\n');

  for (const userData of users) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', userData.email)
      .maybeSingle();

    if (user) {
      console.log(`✅ ${userData.email}`);
      console.log(`   Tenant: ${user.tenant_id === targetTenantId ? '✅ SAK Solutions' : '❌ Wrong tenant'}`);
      console.log(`   Active: ${user.is_active ? '✅ Yes' : '❌ No'}`);
      console.log(`   User ID: ${user.id}\n`);
    } else {
      console.log(`❌ ${userData.email} - Not found\n`);
    }
  }

  // Check all users in the SAK Solutions tenant
  const { data: tenantUsers } = await supabase
    .from('users')
    .select('email, first_name, last_name, is_active')
    .eq('tenant_id', targetTenantId)
    .order('created_at', { ascending: false });

  console.log('\n👥 All users in SAK Solutions tenant:');
  console.log('─────────────────────────────────────────────────────────');
  if (tenantUsers && tenantUsers.length > 0) {
    tenantUsers.forEach(u => {
      console.log(`  ${u.email} - ${u.first_name} ${u.last_name} (${u.is_active ? 'Active' : 'Inactive'})`);
    });
  } else {
    console.log('  No users found');
  }

  console.log('\n============================================================\n');
  console.log('⚠️  IMPORTANT: Users can now login with:');
  console.log('   Email: <their email>');
  console.log('   Password: TempPass123!');
  console.log('   They should change their password after first login.');
  console.log('============================================================\n');
}

fixUsers();
