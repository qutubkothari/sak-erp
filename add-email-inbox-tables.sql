-- Email Inbox System Tables
-- Stores fetched emails, attachments, and parsing results

-- Email inbox table - stores all fetched emails
CREATE TABLE IF NOT EXISTS email_inbox (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(500) UNIQUE NOT NULL, -- Unique email ID from mail server
  thread_id VARCHAR(500), -- For grouping related emails
  from_address VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  to_addresses TEXT NOT NULL, -- JSON array of recipients
  cc_addresses TEXT, -- JSON array of CC recipients
  bcc_addresses TEXT, -- JSON array of BCC recipients
  reply_to VARCHAR(255),
  subject TEXT,
  body_text TEXT, -- Plain text version
  body_html TEXT, -- HTML version
  received_date TIMESTAMP NOT NULL,
  fetched_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  folder VARCHAR(100) DEFAULT 'INBOX', -- INBOX, SENT, TRASH, etc.
  labels TEXT, -- JSON array of labels/tags
  has_attachments BOOLEAN DEFAULT FALSE,
  attachment_count INTEGER DEFAULT 0,
  
  -- Intelligent parsing fields
  parsed_type VARCHAR(50), -- 'rfq_response', 'po_acknowledgment', 'customer_inquiry', 'invoice', etc.
  related_entity VARCHAR(50), -- 'purchase_order', 'sales_order', 'rfq', 'grn', etc.
  related_entity_id INTEGER, -- ID of the related record
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00 - how confident the parsing is
  parsed_data JSONB, -- Extracted structured data
  
  -- Processing status
  processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'processed', 'failed', 'manual_review'
  processed_date TIMESTAMP,
  processed_by UUID REFERENCES users(id),
  processing_notes TEXT,
  
  -- Metadata
  spam_score DECIMAL(3,2), -- 0.00 to 1.00
  is_spam BOOLEAN DEFAULT FALSE,
  raw_headers TEXT, -- Full email headers for debugging
  size_bytes INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email attachments table
CREATE TABLE IF NOT EXISTS email_attachments (
  id SERIAL PRIMARY KEY,
  email_id INTEGER NOT NULL REFERENCES email_inbox(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100),
  size_bytes INTEGER,
  storage_path TEXT NOT NULL, -- Path in Supabase storage
  storage_url TEXT, -- Public URL if applicable
  
  -- Parsed attachment info
  is_parsed BOOLEAN DEFAULT FALSE,
  parsed_type VARCHAR(50), -- 'pdf', 'excel', 'image', 'document', 'drawing', etc.
  extracted_text TEXT, -- OCR or text extraction
  extracted_data JSONB, -- Structured data from PDF/Excel
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email parsing rules table - configurable rules for intelligent parsing
CREATE TABLE IF NOT EXISTS email_parsing_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0, -- Higher priority rules checked first
  
  -- Matching conditions
  from_pattern VARCHAR(255), -- Regex or pattern to match sender
  subject_pattern VARCHAR(255), -- Regex to match subject
  body_pattern TEXT, -- Regex to match body content
  
  -- Classification
  parsed_type VARCHAR(50) NOT NULL, -- What type of email this is
  related_entity VARCHAR(50), -- What entity it relates to
  
  -- Extraction rules (JSON config for data extraction)
  extraction_rules JSONB, -- Rules for extracting data from email
  
  -- Actions (JSON config for automated actions)
  auto_actions JSONB, -- Automatic actions to perform
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email templates table (for sending)
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL, -- Supports Handlebars/Mustache syntax
  template_type VARCHAR(50), -- 'purchase', 'sales', 'hr', 'general'
  variables JSONB, -- Available variables for this template
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email sync status table - tracks IMAP sync state
CREATE TABLE IF NOT EXISTS email_sync_status (
  id SERIAL PRIMARY KEY,
  email_account VARCHAR(255) NOT NULL UNIQUE,
  last_sync_date TIMESTAMP,
  last_message_id VARCHAR(500), -- Last fetched message ID
  last_uid INTEGER, -- IMAP UID of last message
  sync_status VARCHAR(50) DEFAULT 'idle', -- 'idle', 'syncing', 'error'
  error_message TEXT,
  total_messages_synced INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_inbox_message_id ON email_inbox(message_id);
CREATE INDEX IF NOT EXISTS idx_email_inbox_from_address ON email_inbox(from_address);
CREATE INDEX IF NOT EXISTS idx_email_inbox_received_date ON email_inbox(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_email_inbox_parsed_type ON email_inbox(parsed_type);
CREATE INDEX IF NOT EXISTS idx_email_inbox_related_entity ON email_inbox(related_entity, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_email_inbox_processing_status ON email_inbox(processing_status);
CREATE INDEX IF NOT EXISTS idx_email_inbox_is_read ON email_inbox(is_read);
CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id ON email_attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_email_parsing_rules_active ON email_parsing_rules(is_active, priority DESC);

-- Insert default parsing rules
INSERT INTO email_parsing_rules (name, description, subject_pattern, parsed_type, related_entity, extraction_rules, auto_actions) VALUES
('RFQ Response', 'Vendor quotes in response to RFQs', '(RE:|FWD:)?.*(RFQ|quote|quotation)', 'rfq_response', 'rfq', 
  '{"rfq_number": "RFQ-\\d{4}-\\d{3}", "quoted_price": "\\$?\\d+\\.?\\d*", "delivery_time": "\\d+\\s*(days|weeks)"}',
  '{"notify_purchase_team": true, "create_task": true}'
),
('PO Acknowledgment', 'Vendor acknowledges purchase order', '(RE:|FWD:)?.*(PO|purchase order|order confirmation)', 'po_acknowledgment', 'purchase_order',
  '{"po_number": "PO-\\d{4}-\\d{3}", "confirmation_status": "(confirmed|accepted|acknowledged)", "expected_delivery": "\\d{4}-\\d{2}-\\d{2}"}',
  '{"update_po_status": true, "notify_purchase_team": true}'
),
('Customer Inquiry', 'General customer questions', '.*', 'customer_inquiry', 'customer',
  '{"customer_name": "", "inquiry_type": ""}',
  '{"create_ticket": true, "notify_sales_team": true}'
),
('Invoice Received', 'Vendor sends invoice', '.*(invoice|bill)', 'invoice', 'grn',
  '{"invoice_number": "(INV|INVOICE)[-\\s]?\\d+", "amount": "\\$?\\d+\\.?\\d*", "due_date": "\\d{4}-\\d{2}-\\d{2}"}',
  '{"create_payable": true, "notify_accounts_team": true}'
)
ON CONFLICT DO NOTHING;

-- Insert initial sync status
INSERT INTO email_sync_status (email_account, sync_status) VALUES
('erpsak53@gmail.com', 'idle')
ON CONFLICT (email_account) DO NOTHING;

COMMENT ON TABLE email_inbox IS 'Stores all fetched emails from IMAP with intelligent parsing';
COMMENT ON TABLE email_attachments IS 'Stores email attachments with OCR and data extraction';
COMMENT ON TABLE email_parsing_rules IS 'Configurable rules for automatically classifying and extracting data from emails';
COMMENT ON TABLE email_templates IS 'Reusable email templates for sending';
COMMENT ON TABLE email_sync_status IS 'Tracks IMAP synchronization state';
