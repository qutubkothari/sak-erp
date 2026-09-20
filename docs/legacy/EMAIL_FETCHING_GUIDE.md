# Email Fetching & Intelligence System - Complete Guide

## Overview

The ERP system now has **full email integration** with intelligent parsing:

✅ **Send Emails** - Already working (PO, RFQ, SO, notifications)  
✅ **Fetch Emails** - IMAP integration to read incoming emails  
✅ **Parse Emails** - AI-like intelligent parsing using rules  
✅ **Handle Attachments** - PDF/Excel parsing, OCR-ready  
✅ **Auto-Actions** - Automated responses based on email content  

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Email System Flow                        │
└─────────────────────────────────────────────────────────────┘

Vendor/Customer Email
         ↓
    Gmail IMAP
         ↓
  EmailFetchService ────→ Database (email_inbox)
         ↓                     ↓
  EmailParserService ──→ Intelligent Parsing
         ↓                     ↓
  Parsing Rules ────────→ Extract Data
         ↓                     ↓
  Related Entity ───────→ Link to PO/RFQ/SO
         ↓
  Auto Actions ─────────→ Notifications, Tasks
```

---

## Database Tables

### 1. `email_inbox` - Main inbox table
- Stores all fetched emails
- Intelligent parsing results
- Links to related entities (PO, RFQ, SO, GRN)
- Processing status tracking

### 2. `email_attachments` - Attachment storage
- PDF/Excel parsing
- OCR-ready for images
- Links to Supabase storage
- Extracted text/data

### 3. `email_parsing_rules` - Intelligence rules
- Configurable patterns
- Regex-based matching
- Data extraction rules
- Auto-action definitions

### 4. `email_templates` - Outgoing templates
- Reusable email templates
- Variable substitution

### 5. `email_sync_status` - Sync tracking
- Last sync date/time
- Error tracking
- Message counts

---

## Setup Instructions

### Step 1: Run Database Migration

```bash
psql -h aws-0-ap-south-1.pooler.supabase.com -p 6543 -d postgres -U postgres.bguypjqwdwshvxkjqvrh -f add-email-inbox-tables.sql
```

### Step 2: Configure Environment Variables

Add to EC2 `.env` file:

```bash
# IMAP Configuration (Gmail)
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"
IMAP_USER="kutubkothari@gmail.com"
IMAP_PASS="your-gmail-app-password"  # Same as SMTP_PASS
IMAP_TLS="true"

# Email Fetching
EMAIL_FETCH_ENABLED="true"  # Enable automatic fetching
EMAIL_FETCH_INTERVAL="5"     # Minutes between fetches

# Already configured
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="kutubkothari@gmail.com"
SMTP_PASS="your-gmail-app-password"
```

**Note:** IMAP uses the same Gmail App Password as SMTP.

### Step 3: Deploy to EC2

```powershell
.\deploy-ec2-auto.ps1
```

### Step 4: Restart Services

```bash
ssh -i saif-erp.pem ubuntu@3.110.100.60
pm2 restart sak-api
pm2 logs sak-api --lines 100
```

---

## API Endpoints

### Email Inbox

#### `GET /api/v1/emails/inbox`
Get inbox emails with pagination and filters.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `folder` - Filter by folder (INBOX, SENT, etc.)
- `is_read` - Filter by read status (true/false)
- `parsed_type` - Filter by type (rfq_response, po_acknowledgment, etc.)
- `search` - Search in subject/body/sender

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "from_address": "vendor@example.com",
      "subject": "RE: RFQ-2024-001 - Quote",
      "received_date": "2024-12-25T10:30:00Z",
      "is_read": false,
      "parsed_type": "rfq_response",
      "related_entity": "rfq",
      "related_entity_id": 123,
      "confidence_score": 0.95
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

#### `GET /api/v1/emails/:id`
Get single email with full details and attachments.

#### `POST /api/v1/emails/:id/read`
Mark email as read/unread.

```json
{ "is_read": true }
```

#### `POST /api/v1/emails/:id/star`
Star/unstar email.

```json
{ "is_starred": true }
```

#### `POST /api/v1/emails/fetch`
Manually trigger email fetch (admin only).

**Response:**
```json
{
  "success": true,
  "fetched": 15,
  "parsed": 15
}
```

#### `POST /api/v1/emails/:id/parse`
Re-parse email with updated rules.

#### `GET /api/v1/emails/stats/dashboard`
Get email statistics.

**Response:**
```json
{
  "total": 500,
  "unread": 45,
  "pending_parse": 12,
  "by_type": [
    { "parsed_type": "rfq_response", "count": 120 },
    { "parsed_type": "po_acknowledgment", "count": 85 }
  ]
}
```

### Attachments

#### `GET /api/v1/emails/:id/attachments`
Get all attachments for an email.

#### `GET /api/v1/emails/attachments/:attachmentId/download`
Download attachment file.

#### `GET /api/v1/emails/attachments/search?q=invoice`
Search attachments by content or filename.

### Testing

#### `GET /api/v1/emails/test/connection`
Test IMAP connection.

**Response:**
```json
{
  "success": true,
  "message": "IMAP connection successful"
}
```

#### `GET /api/v1/emails/scheduler/status`
Get scheduler status.

---

## Intelligent Parsing

### How It Works

1. **Email arrives** → Fetched via IMAP
2. **Pattern matching** → Checks against parsing rules
3. **Data extraction** → Uses regex to extract structured data
4. **Entity linking** → Finds related PO/RFQ/SO/GRN
5. **Confidence scoring** → 0.00 to 1.00 (how confident the system is)
6. **Auto actions** → If confidence > 0.7, executes actions

### Built-in Parsing Rules

#### 1. RFQ Response
- **Detects:** Vendor quotes/quotations
- **Pattern:** Subject contains "RFQ", "quote", "quotation"
- **Extracts:** RFQ number, quoted price, delivery time
- **Links to:** Purchase Requisition (RFQ)
- **Actions:** Notify purchase team, create task

#### 2. PO Acknowledgment
- **Detects:** Vendor confirms purchase order
- **Pattern:** Subject contains "PO", "purchase order", "order confirmation"
- **Extracts:** PO number, confirmation status, delivery date
- **Links to:** Purchase Order
- **Actions:** Update PO status, notify purchase team

#### 3. Customer Inquiry
- **Detects:** General customer questions
- **Pattern:** Any email
- **Extracts:** Customer name, inquiry type
- **Links to:** Customer
- **Actions:** Create support ticket, notify sales team

#### 4. Invoice Received
- **Detects:** Vendor invoices
- **Pattern:** Subject contains "invoice", "bill"
- **Extracts:** Invoice number, amount, due date
- **Links to:** GRN
- **Actions:** Create payable, notify accounts team

### Adding Custom Rules

```sql
INSERT INTO email_parsing_rules (
  name, description, subject_pattern, parsed_type, related_entity,
  extraction_rules, auto_actions
) VALUES (
  'Delivery Confirmation',
  'Vendor confirms delivery/dispatch',
  '.*(shipped|dispatched|delivery)',
  'delivery_confirmation',
  'purchase_order',
  '{"tracking_number": "tracking[#:\\s]*([A-Z0-9]+)", "delivery_date": "\\d{4}-\\d{2}-\\d{2}"}',
  '{"update_po_status": true, "notify_purchase_team": true, "create_grn_draft": true}'
);
```

### Extraction Rules (JSON)

Use regex patterns to extract data:

```json
{
  "po_number": "PO-\\d{4}-\\d{3}",
  "amount": "\\$?\\d+\\.?\\d*",
  "delivery_date": "\\d{4}-\\d{2}-\\d{2}",
  "tracking_number": "[A-Z0-9]{10,}"
}
```

### Auto Actions (JSON)

Define automated responses:

```json
{
  "notify_purchase_team": true,
  "notify_sales_team": false,
  "create_task": true,
  "update_po_status": true,
  "create_payable": false
}
```

---

## Attachment Parsing

### Supported Formats

✅ **PDF** - Full text extraction  
✅ **Excel (.xlsx, .xls)** - Sheet data extraction  
✅ **Text files** - Plain text  
🔜 **Images** - OCR (Tesseract integration planned)  

### PDF Example

Automatically extracts:
- Invoice numbers
- PO references
- Amounts
- Dates
- Vendor details

### Excel Example

Extracts all sheets as structured data:

```json
{
  "Sheet1": [
    { "Item": "Widget A", "Qty": 100, "Price": 25.50 },
    { "Item": "Widget B", "Qty": 50, "Price": 45.00 }
  ]
}
```

---

## Background Jobs (Automated)

### Email Fetcher
- **Frequency:** Every 5 minutes
- **Action:** Fetch unread emails from IMAP
- **Processes:** New emails only

### Email Parser
- **Frequency:** Every 10 minutes
- **Action:** Parse pending emails
- **Processes:** Up to 50 emails per batch

### Configuration

```bash
EMAIL_FETCH_ENABLED="true"   # Enable/disable automatic fetching
```

To disable automatic fetching (manual only):
```bash
EMAIL_FETCH_ENABLED="false"
```

---

## Manual Operations

### Fetch Emails Manually

```bash
curl -X POST http://3.110.100.60:4000/api/v1/emails/fetch \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Re-parse Email

```bash
curl -X POST http://3.110.100.60:4000/api/v1/emails/123/parse \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Connection

```bash
curl http://3.110.100.60:4000/api/v1/emails/test/connection \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Workflow Examples

### Example 1: RFQ Response

1. Vendor sends: "RE: RFQ-2024-001 - Our Quote"
2. System fetches email
3. Parses subject → Detects "RFQ" pattern
4. Extracts RFQ-2024-001 from subject
5. Finds RFQ #123 in database
6. Links email to RFQ #123
7. Confidence: 0.95 (high)
8. Auto-action: Notify purchase manager

### Example 2: Invoice with PDF

1. Vendor sends invoice with PDF attachment
2. System fetches email + attachment
3. Uploads PDF to Supabase storage
4. Parses PDF → Extracts text
5. Finds invoice number, amount, PO reference
6. Links to GRN record
7. Creates accounts payable entry
8. Notifies accounts team

### Example 3: Customer Inquiry

1. Customer emails: "When will order SO-2024-050 ship?"
2. System fetches email
3. Extracts SO-2024-050
4. Finds Sales Order #50
5. Links email to SO
6. Confidence: 0.85 (good)
7. Creates support ticket
8. Notifies sales team

---

## Monitoring & Debugging

### Check Sync Status

```sql
SELECT * FROM email_sync_status;
```

### View Recent Emails

```sql
SELECT id, from_address, subject, parsed_type, confidence_score, processing_status
FROM email_inbox
ORDER BY received_date DESC
LIMIT 20;
```

### Check Parsing Rules

```sql
SELECT id, name, priority, is_active
FROM email_parsing_rules
ORDER BY priority DESC;
```

### View Attachments

```sql
SELECT ea.id, ea.filename, ea.parsed_type, ea.is_parsed, ei.subject
FROM email_attachments ea
JOIN email_inbox ei ON ea.email_id = ei.id
ORDER BY ea.id DESC
LIMIT 20;
```

### PM2 Logs

```bash
pm2 logs sak-api --lines 100
pm2 logs sak-api | grep -i "email"
```

---

## Security & Permissions

- All email endpoints require JWT authentication
- Role-based access can be added per endpoint
- Attachments stored in Supabase with access control
- Sensitive data masked in logs

---

## Future Enhancements

🔜 **OCR for Images** - Extract text from scanned documents  
🔜 **AI-Powered Parsing** - Use LLM for better understanding  
🔜 **Email Templates** - More pre-built templates  
🔜 **Reply Automation** - Auto-reply to common queries  
🔜 **Email Threading** - Group related emails  
🔜 **Sentiment Analysis** - Detect urgent/angry emails  

---

## Troubleshooting

### "IMAP connection failed"
- Check IMAP credentials in .env
- Ensure Gmail App Password is correct
- Verify IMAP is enabled in Gmail settings

### "No emails fetched"
- Check `EMAIL_FETCH_ENABLED=true`
- View sync status: `SELECT * FROM email_sync_status`
- Test connection: `GET /api/v1/emails/test/connection`

### "Parsing failed"
- Check parsing rules are active
- View processing_status in email_inbox
- Re-parse manually: `POST /api/v1/emails/:id/parse`

### "Attachments not downloading"
- Verify Supabase storage credentials
- Check storage bucket permissions
- View logs: `pm2 logs sak-api`

---

## Summary

Your ERP now has **complete email intelligence**:

✅ Automatically fetches emails every 5 minutes  
✅ Intelligently parses and categorizes  
✅ Extracts data from email body and attachments  
✅ Links to existing records (PO, RFQ, SO, GRN)  
✅ Executes automated actions  
✅ Full API for frontend integration  
✅ Searchable attachment content  
✅ PDF/Excel parsing built-in  

**Next steps:**
1. Run database migration
2. Configure IMAP in .env
3. Deploy to EC2
4. Test connection
5. Build frontend UI for email inbox
