-- Email Configuration Table
-- Stores centralized email addresses for the entire system

CREATE TABLE IF NOT EXISTS email_config (
  id SERIAL PRIMARY KEY,
  email_type VARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'sales', 'support', 'technical', 'purchase', 'hr', 'noreply'
  email_address VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_config_type ON email_config(email_type);
CREATE INDEX IF NOT EXISTS idx_email_config_active ON email_config(is_active);

-- Insert default email configuration
INSERT INTO email_config (email_type, email_address, display_name, description) VALUES
  ('admin', 'erpsak53@gmail.com', 'System Administrator', 'System notifications, critical alerts, and administrative messages'),
  ('sales', 'erpsak53@gmail.com', 'Sales Department', 'Quotations, sales orders, and customer communications'),
  ('support', 'erpsak53@gmail.com', 'Customer Support', 'Customer support requests, service tickets, and inquiries'),
  ('technical', 'erpsak53@gmail.com', 'Technical Team', 'Technical inquiries, engineering questions, and product specifications'),
  ('purchase', 'erpsak53@gmail.com', 'Purchase Department', 'Purchase orders, vendor communications, and procurement'),
  ('hr', 'erpsak53@gmail.com', 'Human Resources', 'Employee matters, payroll, leaves, and HR communications'),
  ('noreply', 'erpsak53@gmail.com', 'No Reply', 'Automated system notifications (do not reply)')
ON CONFLICT (email_type) DO NOTHING;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_email_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_config_updated ON email_config;
CREATE TRIGGER email_config_updated
BEFORE UPDATE ON email_config
FOR EACH ROW
EXECUTE FUNCTION update_email_config_timestamp();
