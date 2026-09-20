# Gmail SMTP Setup Guide

## Important: Current System ONLY SENDS Emails

**The ERP system currently only SENDS emails (notifications, POs, RFQs, etc.)**
- ✅ System can: Send emails from your Gmail account
- ❌ System cannot: Read incoming emails, fetch replies, or monitor inbox

## Gmail SMTP Configuration

### Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification" if not already enabled
3. This is **required** to generate App Passwords

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Click "Select app" → Choose "Mail"
3. Click "Select device" → Choose "Other (Custom name)"
4. Enter name: "SAK ERP System"
5. Click "Generate"
6. Copy the 16-character password (example: `abcd efgh ijkl mnop`)
7. **Save this password - you won't see it again!**

### Step 3: SMTP Settings for Gmail

```bash
# Email Configuration
DEFAULT_EMAIL="kutubkothari@gmail.com"
EMAIL_ADMIN="kutubkothari@gmail.com"
EMAIL_SALES="kutubkothari@gmail.com"
EMAIL_SUPPORT="kutubkothari@gmail.com"
EMAIL_TECHNICAL="kutubkothari@gmail.com"
EMAIL_PURCHASE="kutubkothari@gmail.com"
EMAIL_HR="kutubkothari@gmail.com"
EMAIL_NOREPLY="kutubkothari@gmail.com"

# Company Information
COMPANY_NAME="SAK Solutions"
COMPANY_ADDRESS="Your Company Address Here"
COMPANY_PHONE="+91-XXXXXXXXXX"

# Gmail SMTP Settings
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="kutubkothari@gmail.com"
SMTP_PASS="your-16-char-app-password-here"
SMTP_FROM="kutubkothari@gmail.com"
```

## Step 4: Update EC2 .env File

SSH into EC2 and edit the .env file:

```bash
ssh -i saif-erp.pem ubuntu@3.110.100.60
cd ~/sak-erp
nano .env
```

Add/update the SMTP settings, then restart API:
```bash
pm2 restart sak-api
```

## Testing Email Sending

After configuration, test by:
1. Creating a Purchase Order → System sends email to vendor
2. Creating RFQ → System sends email to vendors
3. Document workflow → System sends approval emails
4. Sales Order → System sends confirmation to customer

## Common Issues

### "Username and Password not accepted"
- Make sure you're using App Password, not regular Gmail password
- Regular Gmail password will NOT work

### "Connection timeout"
- Check SMTP_HOST is `smtp.gmail.com`
- Check SMTP_PORT is `587`
- Verify EC2 security group allows outbound SMTP traffic

### "Less secure app access"
- This is no longer needed with App Passwords
- App Passwords are the secure way to authenticate

## Gmail Sending Limits

- **Free Gmail**: 500 emails/day
- **Google Workspace**: 2,000 emails/day
- Consider using SendGrid or AWS SES for higher volume

## About Email Fetching (Currently NOT Supported)

If you need to **READ incoming emails** (fetch vendor responses, customer inquiries, etc.):

### What would be needed:
1. **IMAP Configuration**: To connect and read emails
2. **Email Parsing Service**: To extract data from replies
3. **Database Integration**: To match replies to original records
4. **Background Job**: To periodically check for new emails

### Protocols for reading email:
- **IMAP** (recommended): For reading, organizing, syncing
- **POP3** (basic): Downloads and deletes from server

### Would require new features:
- `apps/api/src/email/email-fetch.service.ts`
- IMAP credentials in .env (IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASS)
- Scheduled cron job to check inbox
- Email parsing logic (extract PO numbers, order confirmations, etc.)

## Current Email Flow

```
ERP System → SMTP (Gmail) → Vendor/Customer
     ↓
Email sent successfully
     ↓
Vendor receives email
     ↓
Vendor replies to email
     ↓
Reply goes to Gmail inbox ← You check manually
```

## Summary

✅ **What works now:**
- System sends transactional emails (PO, RFQ, SO, etc.)
- All emails appear to come from kutubkothari@gmail.com
- Recipients can reply to emails
- Replies go to Gmail inbox (check manually)

❌ **What doesn't work (yet):**
- Automatic reading of incoming emails
- Processing vendor/customer replies
- Email-based status updates
- Inbox monitoring

Let me know if you want to implement email fetching functionality!
