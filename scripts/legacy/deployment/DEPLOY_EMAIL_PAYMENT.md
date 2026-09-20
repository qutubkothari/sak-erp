# Deployment Instructions: Email Integration & Payment Recording

## Overview
This deployment adds:
1. Email integration for sending debit notes to suppliers
2. Payment recording functionality for accounts payable

## Files to Deploy

### Backend (API)
1. `apps/api/src/purchase/services/debit-note.service.ts` - Added sendEmail() and recordPayment() methods
2. `apps/api/src/purchase/controllers/debit-note.controller.ts` - Added /send-email and /grn/:grnId/payment endpoints
3. `apps/api/src/email/email.service.ts` - Added generic sendEmail() method

### Frontend (Web)
1. `apps/web/src/app/dashboard/purchase/debit-notes/page.tsx` - Replaced "Mark as Sent" with "Send Email to Supplier"
2. `apps/web/src/app/dashboard/accounts/payables/page.tsx` - Added payment recording modal and functionality

### Database Migration (Optional - if payment tracking columns don't exist)
1. `add-grn-payment-tracking.sql` - Adds payment tracking fields to grns table

## Deployment Steps

### Option 1: Manual File Upload (if SSH keys not configured)

1. **Copy files from local to server**
   - Open WinSCP or FileZilla
   - Connect to: ubuntu@13.205.17.214
   - Upload the above files to their respective locations in `/home/ubuntu/sak-erp/`

### Option 2: Git Push & Pull (Recommended)

```powershell
# On local machine (Windows)
cd "c:\Users\musta\OneDrive\Documents\GitHub\Manufacturing ERP"
git add .
git commit -m "feat: Add email integration and payment recording for debit notes"
git push origin main

# On server (via SSH)
cd /home/ubuntu/sak-erp
git pull origin main
```

### Option 3: Direct Copy-Paste (if other options fail)

The files are available in your local workspace. You can:
1. Open each file in VS Code
2. Copy the entire content
3. SSH into server: `ssh ubuntu@13.205.17.214`
4. Edit file: `nano /home/ubuntu/sak-erp/apps/api/src/purchase/services/debit-note.service.ts`
5. Paste content
6. Save (Ctrl+X, Y, Enter)
7. Repeat for other files

## After Files are Uploaded

### 1. Run Database Migration (if needed)
```bash
# SSH into server
ssh ubuntu@13.205.17.214

# Run migration
cd /home/ubuntu/sak-erp
psql "$SUPABASE_URL" -f add-grn-payment-tracking.sql
```

### 2. Rebuild and Restart API
```bash
cd /home/ubuntu/sak-erp/apps/api
npm run build
pm2 restart sak-api
pm2 logs sak-api --lines 50
```

### 3. Rebuild and Restart Frontend
```bash
cd /home/ubuntu/sak-erp/apps/web
npm run build
pm2 restart sak-web
pm2 logs sak-web --lines 50
```

## Verification

### 1. Check API Status
- Visit: http://13.205.17.214:4000/health
- Should return API health status

### 2. Check Frontend
- Visit: http://13.205.17.214:3000/dashboard/purchase/debit-notes
- Should see "Send Email to Supplier" button for APPROVED debit notes
- Visit: http://13.205.17.214:3000/dashboard/accounts/payables
- Should see "Record Payment" buttons for each GRN

### 3. Test Email Functionality
1. Go to Debit Notes page
2. Find an APPROVED debit note
3. Click "Send Email to Supplier"
4. Check if email is sent and status updates to SENT

### 4. Test Payment Recording
1. Go to Accounts Payable page
2. Click on a vendor to see GRN breakdown
3. Click "Record Payment" for a GRN
4. Fill payment form and submit
5. Verify payment is recorded and balance updates

## Email Configuration

Ensure these environment variables are set in `/home/ubuntu/sak-erp/.env`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
COMPANY_NAME=SAK Manufacturing
```

If not configured, emails will fail. Contact admin to set up SMTP credentials.

## Troubleshooting

### API won't restart
```bash
# Check for syntax errors
cd /home/ubuntu/sak-erp/apps/api
npm run build

# If build fails, check logs
cat /home/ubuntu/.pm2/logs/sak-api-error.log
```

### Frontend won't build
```bash
# Check for TypeScript errors
cd /home/ubuntu/sak-erp/apps/web
npm run build

# If build fails, check error message
```

### Email not sending
1. Check SMTP credentials in `.env`
2. Verify vendor has email address configured
3. Check API logs: `pm2 logs sak-api`

### Payment not recording
1. Verify database migration ran successfully
2. Check GRN has net_payable_amount > 0
3. Check API logs for errors

## Rollback (if needed)

If deployment causes issues:

```bash
# Rollback API
cd /home/ubuntu/sak-erp
git log --oneline -5  # Find previous commit hash
git checkout <previous-commit-hash>
cd apps/api
npm run build
pm2 restart sak-api

# Rollback Frontend
cd /home/ubuntu/sak-erp/apps/web
npm run build
pm2 restart sak-web
```

## New API Endpoints

1. **POST** `/api/v1/purchase/debit-notes/:id/send-email`
   - Sends debit note email to supplier
   - Auto-updates status to SENT
   - Requires: Debit note ID
   - Returns: Success message

2. **POST** `/api/v1/purchase/debit-notes/grn/:grnId/payment`
   - Records payment against GRN
   - Updates paid_amount and payment_status
   - Requires: grnId and payment data (amount, method, reference, date, notes)
   - Returns: Payment summary with remaining balance

## Support

If you encounter issues during deployment:
1. Check PM2 logs: `pm2 logs`
2. Check build errors: `npm run build` in respective directory
3. Verify database connectivity
4. Ensure all environment variables are set

For urgent issues, rollback to previous version and investigate in development environment.
