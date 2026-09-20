# Gmail SMTP Configuration Guide

This guide explains how to configure Gmail SMTP for the ERP system using **erpsak53@gmail.com**.

## Prerequisites

1. Access to the Gmail account: **erpsak53@gmail.com**
2. SSH access to the EC2 server
3. Gmail App Password (not your regular Gmail password)

## Step 1: Generate Gmail App Password

⚠️ **IMPORTANT**: You MUST use an App Password, not your regular Gmail password!

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Enable **2-Step Verification** if not already enabled
4. Navigate to **Security** → **App passwords**
5. Select app: **Mail**
6. Select device: **Other (Custom name)** → Enter "ERP System"
7. Click **Generate**
8. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

## Step 2: Run the Configuration Script

Open PowerShell and run:

```powershell
cd "C:\Users\musta\OneDrive\Documents\GitHub\Manufacturing ERP"
.\scripts\ec2-set-gmail-config.ps1
```

When prompted, paste the Gmail App Password (the 16-character code from Step 1).

## Step 3: Verify Configuration

The script will:
1. ✅ Upload Gmail configuration to EC2
2. ✅ Update the `.env` file with:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=erpsak53@gmail.com`
   - `SMTP_PASS=<your-app-password>`
   - All email addresses set to `erpsak53@gmail.com`
3. ✅ Restart the API service
4. ✅ Verify the service is running

## Step 4: Test Email Functionality

1. Log in to the ERP system
2. Try sending an email (e.g., Purchase Order, RFQ, etc.)
3. Check the recipient's inbox to confirm delivery
4. Check PM2 logs if there are issues:
   ```bash
   ssh -i saif-erp.pem ubuntu@3.110.100.60
   pm2 logs sak-api
   ```

## Gmail SMTP Settings

The following settings are configured:

| Setting | Value |
|---------|-------|
| Host | smtp.gmail.com |
| Port | 587 (TLS) |
| Security | STARTTLS |
| Username | erpsak53@gmail.com |
| Password | App Password (16 chars) |
| From Address | erpsak53@gmail.com |

## Email Addresses Configuration

All system email addresses now use: **erpsak53@gmail.com**

- `EMAIL_ADMIN` - System notifications, critical alerts
- `EMAIL_SALES` - Sales orders, quotations, customer communications
- `EMAIL_SUPPORT` - Service tickets, warranty claims
- `EMAIL_TECHNICAL` - Technical documents, engineering communications
- `EMAIL_PURCHASE` - Purchase orders, RFQs, vendor communications
- `EMAIL_HR` - HR communications, payroll notifications
- `EMAIL_NOREPLY` - Automated system notifications

## Troubleshooting

### "Authentication Failed" Error

- ✅ Verify you're using an **App Password**, not regular Gmail password
- ✅ Ensure 2-Step Verification is enabled on the Gmail account
- ✅ Generate a new App Password if the old one isn't working

### Emails Not Being Sent

1. Check PM2 logs:
   ```bash
   pm2 logs sak-api | grep -i "mail\|smtp\|email"
   ```

2. Verify .env configuration:
   ```bash
   ssh -i saif-erp.pem ubuntu@3.110.100.60
   grep SMTP /home/ubuntu/sak-erp/apps/api/.env
   ```

3. Test SMTP connection manually:
   ```bash
   telnet smtp.gmail.com 587
   ```

### Gmail Blocking Emails

- Check your Gmail account for security alerts
- Verify the App Password is still valid
- Check Gmail's "Less secure app access" settings (should not be needed with App Password)

## Security Notes

- ✅ The Gmail App Password is stored securely in the `.env` file on EC2
- ✅ Never commit the `.env` file to Git
- ✅ The password is transmitted securely using SSH/SCP
- ✅ Rotate the App Password periodically for security

## Manual Configuration (Alternative)

If the script doesn't work, you can manually update the EC2 `.env` file:

1. SSH into EC2:
   ```bash
   ssh -i saif-erp.pem ubuntu@3.110.100.60
   ```

2. Edit the .env file:
   ```bash
   nano /home/ubuntu/sak-erp/apps/api/.env
   ```

3. Update these lines:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=erpsak53@gmail.com
   SMTP_PASS=your-app-password-here
   SMTP_FROM=erpsak53@gmail.com
   DEFAULT_EMAIL=erpsak53@gmail.com
   EMAIL_ADMIN=erpsak53@gmail.com
   EMAIL_SALES=erpsak53@gmail.com
   EMAIL_SUPPORT=erpsak53@gmail.com
   EMAIL_TECHNICAL=erpsak53@gmail.com
   EMAIL_PURCHASE=erpsak53@gmail.com
   EMAIL_HR=erpsak53@gmail.com
   EMAIL_NOREPLY=erpsak53@gmail.com
   ```

4. Restart the API:
   ```bash
   pm2 restart sak-api
   ```

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs sak-api`
2. Verify Gmail account access
3. Ensure App Password is correct
4. Check EC2 security group allows outbound SMTP (port 587)
