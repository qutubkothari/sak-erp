import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

const ROLES = {
  SUPER_ADMIN: {
    role_name: 'Super Admin',
    description: 'Full system access, can manage everything including users and roles',
    permissions: {
      items: ['create', 'read', 'update', 'delete'],
      vendors: ['create', 'read', 'update', 'delete'],
      customers: ['create', 'read', 'update', 'delete'],
      purchase_orders: ['create', 'read', 'update', 'delete', 'approve'],
      purchase_requisitions: ['create', 'read', 'update', 'delete', 'approve'],
      grns: ['create', 'read', 'update', 'delete'],
      sales_orders: ['create', 'read', 'update', 'delete', 'approve'],
      quotations: ['create', 'read', 'update', 'delete'],
      dispatch: ['create', 'read', 'update', 'delete'],
      job_orders: ['create', 'read', 'update', 'delete'],
      bom: ['create', 'read', 'update', 'delete'],
      users: ['create', 'read', 'update', 'delete'],
      roles: ['create', 'read', 'update', 'delete'],
      reports: ['read', 'export']
    }
  },
  MANAGER: {
    role_name: 'Manager',
    description: 'Can manage operations, approve orders, but cannot delete critical data or manage users',
    permissions: {
      items: ['create', 'read', 'update'],
      vendors: ['create', 'read', 'update'],
      customers: ['create', 'read', 'update'],
      purchase_orders: ['create', 'read', 'update', 'approve'],
      purchase_requisitions: ['create', 'read', 'update', 'approve'],
      grns: ['create', 'read', 'update'],
      sales_orders: ['create', 'read', 'update', 'approve'],
      quotations: ['create', 'read', 'update', 'delete'],
      dispatch: ['create', 'read', 'update'],
      job_orders: ['create', 'read', 'update'],
      bom: ['create', 'read', 'update'],
      reports: ['read', 'export']
    }
  },
  USER: {
    role_name: 'User',
    description: 'Standard user, can create and edit records but cannot approve or delete',
    permissions: {
      items: ['create', 'read', 'update'],
      vendors: ['read'],
      customers: ['read'],
      purchase_orders: ['create', 'read'],
      purchase_requisitions: ['create', 'read', 'update'],
      grns: ['create', 'read'],
      sales_orders: ['create', 'read'],
      quotations: ['create', 'read', 'update'],
      dispatch: ['create', 'read'],
      job_orders: ['create', 'read'],
      bom: ['read'],
      reports: ['read']
    }
  },
  VIEWER: {
    role_name: 'Viewer',
    description: 'Read-only access to all modules',
    permissions: {
      items: ['read'],
      vendors: ['read'],
      customers: ['read'],
      purchase_orders: ['read'],
      purchase_requisitions: ['read'],
      grns: ['read'],
      sales_orders: ['read'],
      quotations: ['read'],
      dispatch: ['read'],
      job_orders: ['read'],
      bom: ['read'],
      reports: ['read']
    }
  }
};

async function setupRolesAndPermissions() {
  console.log('\n=== SETTING UP ROLES AND PERMISSIONS ===\n');

  // Step 1: Clear existing broken roles
  console.log('1. Cleaning up existing roles...\n');
  
  const { data: existingRoles } = await supabase
    .from('roles')
    .select('*')
    .eq('tenant_id', tenantId);

  if (existingRoles && existingRoles.length > 0) {
    console.log(`Found ${existingRoles.length} existing roles\n`);
  }

  // Step 2: Create new roles
  console.log('2. Creating/Updating roles...\n');

  const roleIds = {};
  
  for (const [key, roleData] of Object.entries(ROLES)) {
    // Check if role exists
    const { data: existing } = await supabase
      .from('roles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('name', roleData.role_name)
      .single();

    if (existing) {
      // Update existing role
      const { data, error } = await supabase
        .from('roles')
        .update({
          permissions: roleData.permissions
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.log(`❌ Failed to update ${roleData.role_name}: ${error.message}`);
      } else {
        roleIds[key] = data.id;
        console.log(`✅ Updated role: ${roleData.role_name}`);
      }
    } else {
      // Create new role
      const { data, error} = await supabase
        .from('roles')
        .insert({
          tenant_id: tenantId,
          code: key,  // Use the key as code (SUPER_ADMIN, MANAGER, etc.)
          name: roleData.role_name,
          permissions: roleData.permissions
        })
        .select()
        .single();

      if (error) {
        console.log(`❌ Failed to create ${roleData.role_name}: ${error.message}`);
      } else {
        roleIds[key] = data.id;
        console.log(`✅ Created role: ${roleData.role_name}`);
        console.log(`   Permissions: ${Object.keys(roleData.permissions).length} resources`);
      }
    }
  }

  console.log('');

  // Step 3: Assign roles to users
  console.log('3. Assigning roles to users...\n');

  const userRoleAssignments = [
    { email: 'support@saifseas.com', role: 'SUPER_ADMIN' },
    { email: 'hnoman@saksolution.com', role: 'MANAGER' },
    { email: 'abdul@saifseas.com', role: 'USER' },
    { email: 'taher@saifautomations.com', role: 'USER' }
  ];

  for (const assignment of userRoleAssignments) {
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', assignment.email)
      .eq('tenant_id', tenantId)
      .single();

    if (!user) {
      console.log(`⚠️  User not found: ${assignment.email}`);
      continue;
    }

    const roleId = roleIds[assignment.role];
    if (!roleId) {
      console.log(`⚠️  Role not found: ${assignment.role}`);
      continue;
    }

    // Update user with role
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role_id: roleId
      })
      .eq('id', user.id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.log(`❌ Failed to assign role to ${assignment.email}: ${updateError.message}`);
    } else {
      console.log(`✅ ${assignment.email} → ${ROLES[assignment.role].role_name}`);
    }
  }

  console.log('\n=== SETUP COMPLETE ===\n');
  console.log('Summary:');
  console.log(`  - Roles created: ${Object.keys(roleIds).length}`);
  console.log(`  - Users updated: ${userRoleAssignments.length}`);
  console.log('\nNext Steps:');
  console.log('  1. Update API controllers to use @RequirePermissions decorator');
  console.log('  2. Add PermissionsGuard to all controllers');
  console.log('  3. Test with each user role');
  console.log('  4. Deploy to production\n');
}

setupRolesAndPermissions().catch(console.error);
