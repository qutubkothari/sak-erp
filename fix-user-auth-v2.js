/**
 * Fix user authentication - properly handle auth.users and public.users sync
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const targetTenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

// Placeholder password hash (bcrypt hash of "placeholder")
const PLACEHOLDER_HASH = '$2b$12$KIXn7qJz4G5z0zP7XqZ1d.vP5mYHvXqZvC8vXqZ1d.vP5mYHvXqZu';

const users = [
  {
    email: 'hnoman@saksolution.com',
    password: 'TempPass123!',
    firstName: 'Husein',
    lastName: 'Noman',
    existingId: '45a48664-12e0-4eb9-a41b-1f44ac66e97b' // Keep existing user ID
  },
  {
    email: 'taher@saifautomations.com',
    password: 'TempPass123!',
    firstName: 'Taher',
    lastName: 'Saif',
    existingId: null
  }
];

async function fixUsersv2() {
  console.log('\n============================================================');
  console.log('FIXING USER AUTHENTICATION (v2)');
  console.log('============================================================\n');
  console.log(`Target Tenant: SAK Solutions (${targetTenantId})\n`);

  for (const userData of users) {
    console.log(`\n📧 Processing: ${userData.email}`);
    console.log('─────────────────────────────────────────────────────────');

    try {
      // Use placeholder hash for public.users (real password is in auth.users)
      const passwordHash = PLACEHOLDER_HASH;

      // Check if user exists in public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', userData.email)
        .maybeSingle();

      if (existingUser) {
        console.log(`  ✅ Public user exists (ID: ${existingUser.id})`);
        
        // Create/update auth user with the SAME ID
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          id: existingUser.id, // Use the existing ID!
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            first_name: userData.firstName,
            last_name: userData.lastName
          }
        });

        if (authError) {
          if (authError.message.includes('already been registered')) {
            console.log(`  ✅ Auth user already exists`);
            
            // Try to reset password
            const { error: resetError } = await supabase.auth.admin.updateUserById(
              existingUser.id,
              { password: userData.password }
            );
            
            if (resetError) {
              console.log(`  ⚠️  Could not reset password: ${resetError.message}`);
            } else {
              console.log(`  ✅ Password reset to: ${userData.password}`);
            }
          } else {
            console.error(`  ❌ Error creating auth user: ${authError.message}`);
            continue;
          }
        } else {
          console.log(`  ✅ Created auth user`);
          console.log(`  🔑 Password: ${userData.password}`);
        }

        // Update public user if needed
        const updates = {};
        if (existingUser.tenant_id !== targetTenantId) {
          updates.tenant_id = targetTenantId;
        }
        if (existingUser.password !== passwordHash) {
          updates.password = passwordHash;
        }
        if (!existingUser.is_active) {
          updates.is_active = true;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('id', existingUser.id);

          if (updateError) {
            console.error(`  ❌ Error updating user: ${updateError.message}`);
          } else {
            console.log(`  ✅ Updated public user (${Object.keys(updates).join(', ')})`);
          }
        } else {
          console.log(`  ✅ Public user already up to date`);
        }

      } else {
        // Create completely new user
        console.log(`  ➕ Creating new user...`);
        
        // First create auth user
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

        const userId = authUser.user.id;
        console.log(`  ✅ Created auth user (ID: ${userId})`);
        console.log(`  🔑 Password: ${userData.password}`);

        // Then create public user with the same ID
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: userData.email,
            password: passwordHash,
            first_name: userData.firstName,
            last_name: userData.lastName,
            tenant_id: targetTenantId,
            is_active: true,
            metadata: {}
          });

        if (userError) {
          console.error(`  ❌ Error creating public user: ${userError.message}`);
          // Cleanup - delete the auth user
          await supabase.auth.admin.deleteUser(userId);
        } else {
          console.log(`  ✅ Created public user`);
        }
      }

    } catch (err) {
      console.error(`  ❌ Unexpected error: ${err.message}`);
    }
  }

  // Clean up the orphaned auth user for hnoman if it exists
  console.log('\n\n🧹 Cleaning up orphaned auth users...');
  const orphanedAuthId = 'fe827624-fd17-4700-9d83-aea1b4960484';
  const { error: delError } = await supabase.auth.admin.deleteUser(orphanedAuthId);
  if (delError) {
    console.log(`  ⚠️  Could not delete orphaned user ${orphanedAuthId}: ${delError.message}`);
  } else {
    console.log(`  ✅ Deleted orphaned auth user ${orphanedAuthId}`);
  }

  // Another orphaned one
  const orphanedAuthId2 = '79a0c44c-590d-456c-87b3-816ca13e6192';
  const { error: delError2 } = await supabase.auth.admin.deleteUser(orphanedAuthId2);
  if (delError2 && !delError2.message.includes('not found')) {
    console.log(`  ⚠️  Could not delete orphaned user ${orphanedAuthId2}: ${delError2.message}`);
  } else if (!delError2) {
    console.log(`  ✅ Deleted orphaned auth user ${orphanedAuthId2}`);
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
      const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
      
      console.log(`✅ ${userData.email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Auth: ${authUser?.user ? '✅ Exists' : '❌ Missing'}`);
      console.log(`   Tenant: ${user.tenant_id === targetTenantId ? '✅ SAK Solutions' : '❌ Wrong tenant'}`);
      console.log(`   Active: ${user.is_active ? '✅ Yes' : '❌ No'}\n`);
    } else {
      console.log(`❌ ${userData.email} - Not found in public.users\n`);
    }
  }

  // List all users in SAK Solutions tenant
  const { data: tenantUsers } = await supabase
    .from('users')
    .select('email, first_name, last_name, is_active')
    .eq('tenant_id', targetTenantId)
    .order('email');

  console.log('\n👥 All users in SAK Solutions tenant:');
  console.log('─────────────────────────────────────────────────────────');
  if (tenantUsers && tenantUsers.length > 0) {
    tenantUsers.forEach(u => {
      console.log(`  ✅ ${u.email} - ${u.first_name} ${u.last_name} (${u.is_active ? 'Active' : 'Inactive'})`);
    });
  } else {
    console.log('  No users found');
  }

  console.log('\n============================================================');
  console.log('⚠️  LOGIN CREDENTIALS:');
  console.log('   Email: hnoman@saksolution.com OR taher@saifautomations.com');
  console.log('   Password: TempPass123!');
  console.log('   → Users should change password after first login');
  console.log('============================================================\n');
}

fixUsersv2();
