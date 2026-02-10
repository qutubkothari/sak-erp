/**
 * Create auth users for hnoman and taher - simple direct approach
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';
const targetTenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const supabase = createClient(supabaseUrl, supabaseKey);

const PLACEHOLDER_HASH = '$2b$12$KIXn7qJz4G5z0zP7XqZ1d.vP5mYHvXqZvC8vXqZ1d.vP5mYHvXqZu';

async function createUsers() {
  console.log('\n============================================================');
  console.log('CREATING AUTH USERS - SIMPLE APPROACH');
  console.log('============================================================\n');

  const users = [
    {
      email: 'hnoman@saksolution.com',
      password: 'Welcome@2026',
      existingId: '45a48664-12e0-4eb9-a41b-1f44ac66e97b',
      firstName: 'Husein',
      lastName: 'Noman'
    },
    {
      email: 'taher@saifautomations.com',
      password: 'Welcome@2026',
      existingId: null,
      firstName: 'Taher',
      lastName: 'Saif'
    }
  ];

  for (const user of users) {
    console.log(`\n📧 ${user.email}`);
    console.log('─────────────────────────────────────────────────────────');

    try {
      // Get or create public user
      let { data: publicUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (publicUser) {
        console.log(`  ✅ Public user exists (ID: ${publicUser.id})`);
        
        // Update tenant if needed
        if (publicUser.tenant_id !== targetTenantId) {
          await supabase
            .from('users')
            .update({ tenant_id: targetTenantId, is_active: true })
            .eq('id', publicUser.id);
          console.log(`  ✅ Updated tenant to SAK Solutions`);
        }

        // Try to create auth user with same ID
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          id: publicUser.id,
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            first_name: user.firstName,
            last_name: user.lastName,
            tenant_id: targetTenantId
          }
        });

        if (authError) {
          console.log(`  ⚠️  Auth creation: ${authError.message}`);
          
          // Try to update password instead
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            publicUser.id,
            {
              password: user.password,
              email_confirm: true
            }
          );
          
          if (updateError) {
            console.log(`  ⚠️  Password update: ${updateError.message}`);
          } else {
            console.log(`  ✅ Password updated successfully`);
          }
        } else {
          console.log(`  ✅ Auth user created`);
        }

      } else {
        // Create both auth and public user
        console.log(`  ➕ Creating new user...`);
        
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            first_name: user.firstName,
            last_name: user.lastName,
            tenant_id: targetTenantId
          }
        });

        if (authError) {
          console.error(`  ❌ Auth error: ${authError.message}`);
          continue;
        }

        const userId = authData.user.id;
        console.log(`  ✅ Auth user created (ID: ${userId})`);

        // Create public user
        const { error: publicError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: user.email,
            password: PLACEHOLDER_HASH,
            first_name: user.firstName,
            last_name: user.lastName,
            tenant_id: targetTenantId,
            is_active: true,
            metadata: {}
          });

        if (publicError) {
          console.error(`  ❌ Public user error: ${publicError.message}`);
        } else {
          console.log(`  ✅ Public user created`);
        }
      }

      console.log(`  🔑 Password set to: ${user.password}`);

    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
  }

  console.log('\n\n============================================================');
  console.log('✅ DONE - LOGIN CREDENTIALS:');
  console.log('============================================================');
  console.log('');
  console.log('  Email: hnoman@saksolution.com');
  console.log('  Password: Welcome@2026');
  console.log('');
  console.log('  Email: taher@saifautomations.com');
  console.log('  Password: Welcome@2026');
  console.log('');
  console.log('  Tenant: SAK Solutions');
  console.log('============================================================\n');
}

createUsers();
