import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

async function auditPermissions() {
  console.log('\n=== SECURITY AUDIT: DELETE PERMISSIONS ===\n');

  // 1. Check if user_roles table exists
  console.log('1. Checking user_roles table structure...\n');
  
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('tenant_id', tenantId);

  if (rolesError) {
    console.log(`❌ ERROR: user_roles table issue: ${rolesError.message}`);
    console.log('   This means role-based access control may not be implemented!\n');
  } else {
    console.log(`✅ user_roles table exists with ${roles?.length || 0} roles`);
    if (roles && roles.length > 0) {
      console.log('\nExisting Roles:');
      roles.forEach(role => {
        console.log(`  - ${role.role_name}: ${JSON.stringify(role.permissions || {})}`);
      });
    }
    console.log('');
  }

  // 2. Check users and their roles
  console.log('2. Checking user role assignments...\n');
  
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('tenant_id', tenantId);

  if (usersError) {
    console.log(`❌ ERROR: ${usersError.message}\n`);
  } else {
    console.log(`Found ${users?.length || 0} users\n`);
    users?.forEach(user => {
      console.log(`User: ${user.email || user.name}`);
      console.log(`  Role: ${user.role || 'NO ROLE ASSIGNED'}`);
      console.log(`  ID: ${user.id}`);
      console.log('');
    });
  }

  // 3. Check for any audit logs
  console.log('3. Checking for audit/activity logs...\n');
  
  const { data: activityLogs, error: logsError } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (logsError) {
    console.log(`❌ No activity_logs table found: ${logsError.message}`);
    console.log('   WARNING: No audit trail exists for user actions!\n');
  } else {
    console.log(`✅ Activity logs exist (${activityLogs?.length || 0} recent entries)`);
    if (activityLogs && activityLogs.length > 0) {
      console.log('\nRecent activities:');
      activityLogs.slice(0, 5).forEach(log => {
        console.log(`  ${log.created_at}: ${log.action} by ${log.user_id}`);
      });
    }
    console.log('');
  }

  // 4. Check database schema for soft delete patterns
  console.log('4. Checking tables for soft delete (is_active) pattern...\n');
  
  const tables = ['items', 'vendors', 'customers', 'purchase_orders', 'grns', 'sales_orders'];
  const schemaCheck = {};
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('is_active')
      .limit(1);
    
    schemaCheck[table] = error ? `❌ ${error.message}` : '✅ has is_active column';
  }

  console.log('Table soft-delete support:');
  Object.entries(schemaCheck).forEach(([table, status]) => {
    console.log(`  ${table}: ${status}`);
  });

  // 5. Summary and recommendations
  console.log('\n\n=== SECURITY AUDIT SUMMARY ===\n');
  
  const issues = [];
  
  if (rolesError) {
    issues.push('❌ CRITICAL: user_roles table not found or accessible');
    issues.push('   → Implement role-based access control immediately');
  }
  
  if (!roles || roles.length === 0) {
    issues.push('❌ CRITICAL: No roles defined in system');
    issues.push('   → Create roles (Admin, Manager, User, etc.) with permissions');
  }
  
  if (logsError) {
    issues.push('❌ HIGH: No audit logging implemented');
    issues.push('   → Add activity_logs table to track all user actions');
  }
  
  const noSoftDelete = Object.entries(schemaCheck).filter(([t, s]) => s.includes('❌'));
  if (noSoftDelete.length > 0) {
    issues.push('❌ MEDIUM: Some tables lack soft delete support');
    issues.push(`   → Tables: ${noSoftDelete.map(([t]) => t).join(', ')}`);
  }

  if (issues.length === 0) {
    console.log('✅ No major security issues found');
  } else {
    console.log('ISSUES FOUND:\n');
    issues.forEach(issue => console.log(issue));
  }

  console.log('\n=== NEXT STEPS ===\n');
  console.log('1. Review all API endpoints for permission checks');
  console.log('2. Add authorization middleware to verify user roles');
  console.log('3. Implement activity logging for all delete operations');
  console.log('4. Add frontend permission checks (but never rely only on frontend)');
  console.log('5. Use soft deletes (is_active=false) instead of hard deletes');
  console.log('6. Add database-level Row Level Security (RLS) policies');
}

auditPermissions().catch(console.error);
