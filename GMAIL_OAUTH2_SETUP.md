# Gmail OAuth2 + Pub/Sub Setup Guide

This guide walks you through setting up Gmail with OAuth2 authentication for sending emails AND receiving emails via Pub/Sub webhooks.

## Why OAuth2 instead of App Password?

✅ **More Secure** - OAuth2 tokens are more secure than passwords  
✅ **Send & Receive** - Can both send emails (SMTP) and receive via Pub/Sub  
✅ **Real-time Notifications** - Get instant webhooks when emails arrive  
✅ **No Password Needed** - No need to generate app passwords  

---

## Part 1: Google Cloud Project Setup

### Step 1: Create GCP Project

1. Go to https://console.cloud.google.com/
2. Click **Select a project** → **New Project**
3. Name: `SAK ERP Gmail Integration`
4. Click **Create**

### Step 2: Enable APIs

1. Go to **APIs & Services** → **Library**
2. Search and enable:
   - **Gmail API**
   - **Cloud Pub/Sub API**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (unless you have Google Workspace)
3. Fill in:
   - **App name**: SAK ERP
   - **User support email**: erpsak53@gmail.com
   - **Developer contact**: erpsak53@gmail.com
4. Click **Save and Continue**
5. **Scopes**: Click **Add or Remove Scopes**
   - Add these scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/gmail.send`
6. **Test users**: Add `erpsak53@gmail.com`
7. Click **Save and Continue** → **Back to Dashboard**

---

## Part 2: Create OAuth2 Credentials

### Step 1: Create OAuth Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `SAK ERP Backend`
5. **Authorized redirect URIs**:
   - Add: `http://localhost:4000/api/v1/auth/google/callback` (for local testing)
   - Add: `http://3.110.100.60:4000/api/v1/auth/google/callback` (for EC2)
6. Click **Create**
7. **SAVE THESE**:
   - Client ID
   - Client Secret

### Step 2: Get Refresh Token

We'll create a script to get the refresh token. Run this after setting up the OAuth callback endpoint.

---

## Part 3: Pub/Sub Topic and Subscription

### Step 1: Create Pub/Sub Topic

1. Go to **Pub/Sub** → **Topics**
2. Click **Create Topic**
3. Topic ID: `gmail-notifications`
4. Leave defaults, click **Create**

### Step 2: Grant Gmail Permission to Publish

1. Get your project number:
   - Go to **IAM & Admin** → **Settings**
   - Copy the **Project Number**
2. Go back to your topic → **Permissions**
3. Click **Add Principal**
4. Principal: `serviceAccount:gmail-api-push@system.gserviceaccount.com`
5. Role: **Pub/Sub Publisher**
6. Click **Save**

### Step 3: Create Push Subscription

1. Go to **Pub/Sub** → **Subscriptions**
2. Click **Create Subscription**
3. Subscription ID: `gmail-push-subscription`
4. Select topic: `gmail-notifications`
5. Delivery type: **Push**
6. Endpoint URL: `https://3.110.100.60:4000/api/v1/webhooks/gmail`
   - ⚠️ **MUST be HTTPS** - You'll need SSL certificate on EC2
7. Acknowledgement deadline: **30 seconds**
8. Click **Create**

---

## Part 4: Environment Variables

Add these to your `.env` file on EC2:

```env
# Gmail OAuth2 Configuration
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
GMAIL_USER=erpsak53@gmail.com

# Gmail Pub/Sub
GMAIL_PUBSUB_TOPIC=projects/YOUR_PROJECT_ID/topics/gmail-notifications
GMAIL_PROJECT_ID=your-gcp-project-id

# Existing SMTP settings (fallback)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=erpsak53@gmail.com
SMTP_FROM=erpsak53@gmail.com
```

---

## Part 5: Setup Steps

### Step 1: Install Dependencies

The required packages are already included, but verify:
- `googleapis` - For Gmail API
- `nodemailer` - For sending emails with OAuth2

### Step 2: Deploy Updated Code

```powershell
.\deploy-ec2-auto.ps1
```

### Step 3: Get OAuth2 Refresh Token

1. Visit: `http://3.110.100.60:4000/api/v1/auth/google`
2. Sign in with `erpsak53@gmail.com`
3. Grant permissions
4. Copy the refresh token from the response
5. Add it to your `.env` file

### Step 4: Start Gmail Watch

After deploying, call the API endpoint to start watching the mailbox:

```bash
curl -X POST http://3.110.100.60:4000/api/v1/email/start-watch
```

This needs to be renewed every 7 days (the system will auto-renew).

---

## Part 6: SSL Certificate (Required for Pub/Sub)

Pub/Sub requires HTTPS. You have two options:

### Option A: Let's Encrypt (Free)

```bash
sudo apt-get update
sudo apt-get install certbot
sudo certbot certonly --standalone -d yourdomain.com
```

### Option B: Self-Signed Certificate (Testing Only)

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### Update PM2 to Use SSL

Update your PM2 ecosystem config to enable HTTPS.

---

## Part 7: Testing

### Test Sending Email

```bash
curl -X POST http://3.110.100.60:4000/api/v1/email/test-send \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "Test", "body": "Hello"}'
```

### Test Receiving Email

1. Send an email to `erpsak53@gmail.com`
2. Check PM2 logs: `pm2 logs sak-api`
3. You should see webhook notification
4. Email should appear in your system

---

## Troubleshooting

### "redirect_uri_mismatch"
- Verify the redirect URI in Google Cloud Console matches EXACTLY (http vs https)

### "invalid_grant" or "Token expired"
- Refresh token expired, regenerate it

### Pub/Sub webhook not working
- Check you're using HTTPS
- Verify the endpoint returns 200 OK within 30 seconds
- Check PM2 logs for errors

### Emails not being sent
- Verify refresh token is valid
- Check Gmail API is enabled
- Ensure scopes include `gmail.send`

---

## Security Notes

✅ Never commit OAuth credentials to Git  
✅ Store refresh token securely in `.env`  
✅ Use HTTPS for all webhook endpoints  
✅ Rotate refresh tokens periodically  
✅ Monitor API quota usage in Google Cloud Console  

---

## Cost Considerations

- Gmail API: **FREE** for reasonable usage
- Pub/Sub: **FREE** for first 10GB/month
- Typical ERP usage: < $1/month

---

## Next Steps

After setup:
1. Configure email filters in Gmail
2. Set up spam/newsletter blocking
3. Configure auto-reply rules
4. Monitor email processing logs
5. Set up alerts for failures
