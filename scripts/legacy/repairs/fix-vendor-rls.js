const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwkaruzvzwwuftjquypk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q'
);

async function fixVendorRLS() {
  console.log('Fixing RLS policies for vendors table...\n');

  // Enable RLS
  await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;'
  });

  // Drop existing policies
  const policies = ['view', 'insert', 'update', 'delete'];
  for (const policy of policies) {
    await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Users can ${policy} vendors in their tenant" ON vendors;`
    });
  }

  // Create SELECT policy
  const { error: selectError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY "Users can view vendors in their tenant"
      ON vendors
      FOR SELECT
      USING (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::text
      );
    `
  });

  console.log('✅ Created SELECT policy', selectError ? `❌ Error: ${selectError.message}` : '✅');

  // Create INSERT policy
  const { error: insertError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY "Users can insert vendors in their tenant"
      ON vendors
      FOR INSERT
      WITH CHECK (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::text
      );
    `
  });

  console.log('✅ Created INSERT policy', insertError ? `❌ Error: ${insertError.message}` : '✅');

  // Create UPDATE policy
  const { error: updateError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY "Users can update vendors in their tenant"
      ON vendors
      FOR UPDATE
      USING (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::text
      );
    `
  });

  console.log('✅ Created UPDATE policy', updateError ? `❌ Error: ${updateError.message}` : '✅');

  // Create DELETE policy
  const { error: deleteError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY "Users can delete vendors in their tenant"
      ON vendors
      FOR DELETE
      USING (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::text
      );
    `
  });

  console.log('✅ Created DELETE policy', deleteError ? `❌ Error: ${deleteError.message}` : '✅');

  console.log('\n🎉 RLS policies fixed!\n');
}

fixVendorRLS().catch(console.error);
