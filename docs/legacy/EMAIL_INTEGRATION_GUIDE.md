# Email Integration Setup Guide

## Overview
Email integration has been implemented for:
1. **Purchase Orders (PO)** - Send PO to vendors
2. **PO Tracking Reminders** - Automated reminders for tracking info
3. **RFQ (Request for Quotation)** - Send RFQ to vendors
4. **Sales Orders (SO)** - Send order confirmation to customers
5. **Dispatch Notes** - Send dispatch notification with tracking
6. **Issue Certificates** - Send product certificates to customers

## Environment Configuration

Add the following to your `.env` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASS=your-app-password
COMPANY_NAME=SAK Solutions
```

### Gmail Setup (Recommended for testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Create App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in `SMTP_PASS`

### Other SMTP Providers

**SendGrid** (Recommended for production):
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Amazon SES**:
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

**Microsoft 365**:
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-office365-email
SMTP_PASS=your-password
```

## API Endpoints

### Purchase Orders

**1. Send PO Email to Vendor**
```
POST /api/v1/purchase/orders/:id/send-email
```
Sends complete PO with items, pricing, and terms to vendor

**2. Send Tracking Reminder**
```
POST /api/v1/purchase/orders/:id/send-tracking-reminder
```
Sends automated reminder to vendor requesting tracking information

### Request for Quotation (RFQ)
```
POST /api/v1/purchase/rfq/:id/send-email
```
Sends RFQ to vendors requesting quotations

### Sales Orders
```
POST /api/v1/sales/orders/:id/send-email
```
Sends order confirmation to customers

### Dispatch Notes
```
POST /api/v1/sales/dispatch/:id/send-email
```
Sends dispatch notification with tracking details

### Issue Certificates
```
POST /api/v1/sales/dispatch/:id/send-certificate
```
Sends product issue certificate to customers

## Frontend Integration

### Send PO Email Button

Add to PO view modal or actions:

```typescript
const handleSendPOEmail = async (poId: string) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `http://13.205.17.214:4000/api/v1/purchase/orders/${poId}/send-email`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.ok) {
      alert('PO email sent successfully!');
    } else {
      alert('Failed to send email');
    }
  } catch (error) {
    console.error('Email send error:', error);
    alert('Error sending email');
  }
};
```

### Send Tracking Reminder Button

```typescript
const handleSendTrackingReminder = async (poId: string) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `http://13.205.17.214:4000/api/v1/purchase/orders/${poId}/send-tracking-reminder`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.ok) {
      alert('Tracking reminder sent successfully!');
    } else {
      alert('Failed to send reminder');
    }
  } catch (error) {
    console.error('Reminder send error:', error);
    alert('Error sending reminder');
  }
};
```

## Automatic Reminders (Scheduled)

To enable automatic reminders for overdue POs without tracking:

### Option 1: Cron Job (PM2)

Create `send-tracking-reminders.js`:

```javascript
const fetch = require('node-fetch');

async function sendReminders() {
  const response = await fetch('http://localhost:4000/api/v1/purchase/orders/overdue-tracking');
  const overdueOrders = await response.json();
  
  for (const order of overdueOrders) {
    await fetch(`http://localhost:4000/api/v1/purchase/orders/${order.id}/send-tracking-reminder`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.SYSTEM_TOKEN}` }
    });
  }
  
  console.log(`Sent ${overdueOrders.length} tracking reminders`);
}

sendReminders();
```

Schedule with PM2:
```bash
pm2 start send-tracking-reminders.js --cron "0 10 * * *"
```

### Option 2: NestJS Cron (Recommended)

Install:
```bash
pnpm add @nestjs/schedule
```

Create scheduled task in purchase module:
```typescript
import { Cron } from '@nestjs/schedule';

@Injectable()
export class PurchaseScheduler {
  constructor(
    private poService: PurchaseOrdersService,
    private emailService: EmailService
  ) {}

  @Cron('0 10 * * *') // Daily at 10 AM
  async sendTrackingReminders() {
    const overdueOrders = await this.poService.getOverduePOsWithoutTracking();
    
    for (const po of overdueOrders) {
      await this.poService.sendTrackingReminder(po.tenant_id, po.id);
    }
  }
}
```

## Email Templates

All emails use professional HTML templates with:
- Company branding (SAK Solutions)
- Color scheme: #8B6F47 (amber/brown)
- Responsive design
- Tables for item listings
- Action-oriented content

### Customization

Edit templates in `apps/api/src/email/email.service.ts`:
- `generatePOTemplate()` - Purchase Order
- `generateTrackingReminderTemplate()` - Tracking Reminder
- `generateRFQTemplate()` - RFQ
- `generateSOTemplate()` - Sales Order
- `generateDispatchTemplate()` - Dispatch Note
- `generateCertificateTemplate()` - Issue Certificate

## Testing

1. **Configure SMTP** in `.env`
2. **Restart API server**: `pm2 restart sak-api`
3. **Create test PO** with vendor email
4. **Send email** via API or frontend button
5. **Check vendor inbox** for email

### Test Command

```bash
curl -X POST http://localhost:4000/api/v1/purchase/orders/YOUR_PO_ID/send-email \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Email not sending

1. **Check SMTP credentials** in `.env`
2. **Verify vendor email** exists in database
3. **Check API logs**: `pm2 logs sak-api`
4. **Test SMTP connection**:

```bash
node -e "require('nodemailer').createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'your-email', pass: 'app-password' }
}).verify().then(console.log).catch(console.error)"
```

### Gmail "Less secure app" error

- Don't use regular password
- Create **App Password** with 2FA enabled
- Use App Password in `SMTP_PASS`

### Emails going to spam

1. **Set up SPF record** for your domain
2. **Add DKIM signature** (SendGrid/SES do this automatically)
3. **Use professional email** (not gmail.com for production)
4. **Add unsubscribe link** in footer

## Production Recommendations

1. **Use SendGrid or Amazon SES** (not Gmail)
2. **Set up custom domain** (emails@yourdomain.com)
3. **Configure SPF/DKIM/DMARC** records
4. **Monitor bounce rates**
5. **Implement email queue** (Bull/Redis) for high volume
6. **Add email logs** table to track sent emails
7. **Set up webhooks** for delivery status

## Cost Estimates

- **SendGrid**: $15/month (40,000 emails)
- **Amazon SES**: $0.10 per 1,000 emails
- **Microsoft 365**: $5/user/month (included)
- **Google Workspace**: $6/user/month (included)

## Next Steps

1. Configure SMTP credentials
2. Test with one PO
3. Add email buttons in frontend
4. Set up automatic reminders
5. Monitor email delivery
