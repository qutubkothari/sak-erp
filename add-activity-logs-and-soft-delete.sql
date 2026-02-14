-- Activity Logs Table for Audit Trail
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'CREATE', 'READ', 'UPDATE', 'DELETE'
  resource_type VARCHAR(100) NOT NULL, -- 'vendor', 'item', 'purchase_order', etc.
  resource_id UUID,
  resource_code VARCHAR(100),
  resource_name VARCHAR(500),
  old_value JSONB, -- For updates/deletes, store old state
  new_value JSONB, -- For creates/updates, store new state
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_tenant ON public.activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX idx_activity_logs_resource ON public.activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

COMMENT ON TABLE public.activity_logs IS 'Audit trail for all user actions in the system';
COMMENT ON COLUMN public.activity_logs.action IS 'Type of action: CREATE, READ, UPDATE, DELETE, APPROVE, REJECT';
COMMENT ON COLUMN public.activity_logs.old_value IS 'Snapshot of data before the action (for updates/deletes)';
COMMENT ON COLUMN public.activity_logs.new_value IS 'Snapshot of data after the action (for creates/updates)';

-- Add soft delete columns to tables missing them
ALTER TABLE public.purchase_orders 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id);

ALTER TABLE public.grns 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id);

ALTER TABLE public.sales_orders 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id);

-- Function to log deletions automatically
CREATE OR REPLACE FUNCTION log_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if it's a soft delete (is_active = false)
  IF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
    INSERT INTO activity_logs (
      tenant_id,
      user_id,
      action,
      resource_type,
      resource_id,
      old_value,
      created_at
    ) VALUES (
      OLD.tenant_id,
      current_setting('app.current_user_id', true)::UUID,
      'SOFT_DELETE',
      TG_TABLE_NAME,
      OLD.id,
      row_to_json(OLD),
      NOW()
    );
  -- Hard delete
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (
      tenant_id,
      user_id,
      action,
      resource_type,
      resource_id,
      old_value,
      created_at
    ) VALUES (
      OLD.tenant_id,
      current_setting('app.current_user_id', true)::UUID,
      'HARD_DELETE',
      TG_TABLE_NAME,
      OLD.id,
      row_to_json(OLD),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to critical tables
CREATE TRIGGER audit_vendors_deletion
  BEFORE UPDATE OR DELETE ON vendors
  FOR EACH ROW EXECUTE FUNCTION log_deletion();

CREATE TRIGGER audit_items_deletion
  BEFORE UPDATE OR DELETE ON items
  FOR EACH ROW EXECUTE FUNCTION log_deletion();

CREATE TRIGGER audit_purchase_orders_deletion
  BEFORE UPDATE OR DELETE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION log_deletion();

CREATE TRIGGER audit_grns_deletion
  BEFORE UPDATE OR DELETE ON grns
  FOR EACH ROW EXECUTE FUNCTION log_deletion();

CREATE TRIGGER audit_sales_orders_deletion
  BEFORE UPDATE OR DELETE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION log_deletion();
