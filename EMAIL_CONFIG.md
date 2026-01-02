# Centralized Email Configuration

This system provides a centralized way to manage all email addresses used throughout the application.

## Configuration

All email addresses are configured via environment variables in your `.env` file:

```bash
# Gmail SMTP Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="erpsak53@gmail.com"
SMTP_PASS="your-gmail-app-password"
SMTP_FROM="erpsak53@gmail.com"

# Default email (used for all types if specific ones are not set)
DEFAULT_EMAIL="erpsak53@gmail.com"

# Specific email addresses (optional - will use DEFAULT_EMAIL if not set)
EMAIL_ADMIN="erpsak53@gmail.com"       # Admin notifications, approvals, system alerts
EMAIL_SALES="erpsak53@gmail.com"       # Sales orders, quotations, customer communications
EMAIL_SUPPORT="erpsak53@gmail.com"     # Service tickets, warranty claims, customer support
EMAIL_TECHNICAL="erpsak53@gmail.com"   # Technical documents, engineering communications
EMAIL_PURCHASE="erpsak53@gmail.com"    # POs, RFQs, vendor communications
EMAIL_HR="erpsak53@gmail.com"          # HR communications, payroll notifications
EMAIL_NOREPLY="erpsak53@gmail.com"     # Automated system notifications

# Company information (used in email signatures)
COMPANY_NAME="SAK Solutions"
COMPANY_ADDRESS="Your company address"
COMPANY_PHONE="+1234567890"
```

## Gmail Setup

To use Gmail SMTP:

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to Security → 2-Step Verification (enable if not already)
3. Navigate to Security → App passwords
4. Create a new app password for "Mail"
5. Copy the 16-character password and use it as `SMTP_PASS` in your .env file

## Usage in Code

### Backend (NestJS)

The `EmailConfigService` is available wherever `EmailModule` is imported:

```typescript
import { EmailConfigService } from './email/email-config.service';

@Injectable()
export class YourService {
  constructor(private readonly emailConfig: EmailConfigService) {}

  async sendNotification() {
    // Get specific email addresses
    const adminEmail = this.emailConfig.getAdminEmail();
    const salesEmail = this.emailConfig.getSalesEmail();
    const supportEmail = this.emailConfig.getSupportEmail();
    
    // Or get all emails
    const allEmails = this.emailConfig.getEmailConfig();
    
    // Get formatted sender address
    const fromAddress = this.emailConfig.getFromAddress('sales');
    // Returns: "SAK Solutions <kutubkothari@gmail.com>"
  }
}
```

### Sending Emails

When using `EmailService.sendEmail()`, you can specify the sender type:

```typescript
await this.emailService.sendEmail({
  to: 'customer@example.com',
  subject: 'Your Order Confirmation',
  html: '<p>Thank you for your order!</p>',
  from: 'sales', // Options: 'admin', 'sales', 'support', 'technical', 'purchase', 'hr', 'noreply'
});
```

Email will automatically include:
- Correct "From" address based on type
- Company signature with name, address, phone, and support email
- Professional formatting

### Available Methods

```typescript
// Get individual emails
emailConfig.getAdminEmail()
emailConfig.getSalesEmail()
emailConfig.getSupportEmail()
emailConfig.getTechnicalEmail()
emailConfig.getPurchaseEmail()
emailConfig.getHREmail()
emailConfig.getNoReplyEmail()

// Get company info
emailConfig.getCompanyName()
emailConfig.getCompanyAddress()
emailConfig.getCompanyPhone()

// Get formatted addresses
emailConfig.getFromAddress('sales') // Returns: "SAK Solutions <kutubkothari@gmail.com>"

// Get email signature HTML
emailConfig.getEmailSignature() // Returns formatted HTML signature
```

## Email Types by Module

- **Admin** → Document approvals, system alerts, workflow notifications
- **Sales** → Sales orders, quotations, dispatch notes
- **Support** → Service tickets, warranty claims
- **Technical** → Technical documents, engineering communications
- **Purchase** → Purchase orders, RFQs, vendor communications
- **HR** → Payroll notifications, employee communications
- **No-Reply** → Automated system notifications (password resets, etc.)

## Benefits

✅ **Single source of truth** - Update all email addresses in one place  
✅ **Environment-specific** - Different emails for dev/staging/production  
✅ **No code changes** - Update emails without rebuilding the app  
✅ **Type-safe** - TypeScript interfaces for all email types  
✅ **Professional signatures** - Automatic company branding on all emails  
✅ **Fallback support** - Uses DEFAULT_EMAIL if specific type not configured

## Migration from Old Code

Old code that used:
```typescript
from: `"${this.configService.get('COMPANY_NAME')}" <${this.configService.get('SMTP_USER')}>`
```

Now uses:
```typescript
from: this.emailConfig.getFromAddress('sales')
```

This provides:
- Cleaner code
- Better organization
- Easier to maintain
- More flexibility
