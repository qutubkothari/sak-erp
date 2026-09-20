-- Fix RLS policies for vendors table

-- First, enable RLS on vendors table if not already enabled
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view vendors in their tenant" ON vendors;
DROP POLICY IF EXISTS "Users can insert vendors in their tenant" ON vendors;
DROP POLICY IF EXISTS "Users can update vendors in their tenant" ON vendors;
DROP POLICY IF EXISTS "Users can delete vendors in their tenant" ON vendors;

-- Create SELECT policy: Users can view vendors in their tenant
CREATE POLICY "Users can view vendors in their tenant"
ON vendors
FOR SELECT
USING (
    tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::text
);

-- Create INSERT policy: Users can create vendors in their tenant
CREATE POLICY "Users can insert vendors in their tenant"
ON vendors
FOR INSERT
WITH CHECK (
    tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::text
);

-- Create UPDATE policy: Users can update vendors in their tenant
CREATE POLICY "Users can update vendors in their tenant"
ON vendors
FOR UPDATE
USING (
    tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::text
)
WITH CHECK (
    tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::text
);

-- Create DELETE policy: Users can delete vendors in their tenant
CREATE POLICY "Users can delete vendors in their tenant"
ON vendors
FOR DELETE
USING (
    tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::text
);

-- Verify policies were created
SELECT 
    policyname,
    cmd as command,
    qual as using_expression
FROM pg_policies
WHERE tablename = 'vendors';
