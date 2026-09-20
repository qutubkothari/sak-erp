# DNS Configuration for pms.saksolution.com

## Required DNS Records

Configure these A records in your domain registrar's DNS settings for **saksolution.com**:

### Hostinger VPS IP: `72.62.192.228`

| Type | Name/Host | Value/Points To | TTL |
|------|-----------|-----------------|-----|
| A | pms | 72.62.192.228 | 3600 |
| A | www.pms | 72.62.192.228 | 3600 |

Or if your DNS provider requires full domain names:

| Type | Name/Host | Value/Points To | TTL |
|------|-----------|-----------------|-----|
| A | pms.saksolution.com | 72.62.192.228 | 3600 |
| A | www.pms.saksolution.com | 72.62.192.228 | 3600 |

---

## DNS Provider Instructions

### Common DNS Providers:

#### **GoDaddy**
1. Log in to GoDaddy Domain Manager
2. Click on your domain `saksolution.com`
3. Click "DNS" or "Manage DNS"
4. Add the two A records above
5. Save changes

#### **Namecheap**
1. Log in to Namecheap account
2. Click "Domain List" → Select `saksolution.com`
3. Click "Manage" → "Advanced DNS"
4. Add the two A records above
5. Save all changes

#### **Cloudflare**
1. Log in to Cloudflare
2. Select `saksolution.com` domain
3. Go to "DNS" → "Records"
4. Add the two A records above
5. Set Proxy status to "DNS only" (grey cloud) initially
6. Save records

#### **Hostinger Domain**
1. Log in to Hostinger hPanel
2. Go to "Domains" → Select `saksolution.com`
3. Click "DNS / Nameservers"
4. Add the two A records above
5. Save changes

---

## Verification

### Check DNS Propagation:

**Using Command Line:**
```bash
# Check pms.saksolution.com
nslookup pms.saksolution.com
# Should return: 72.62.192.228

# Check www.pms.saksolution.com
nslookup www.pms.saksolution.com
# Should return: 72.62.192.228
```

**Using Online Tools:**
- https://dnschecker.org - Check global propagation
- https://www.whatsmydns.net - Check from multiple locations

**Expected Result:**
Both domains should resolve to `72.62.192.228`

---

## Propagation Time

- **Typical**: 10-30 minutes
- **Maximum**: Up to 48 hours (rare)
- **Recommendation**: Wait 30 minutes before running HTTPS setup

---

## After DNS is Configured

Once DNS is propagating correctly:

1. **Upload the setup script to your VPS:**
   ```bash
   scp -i C:\Users\QK\.ssh\hostinger_ed25519 setup-https-pms.sh qutubk@72.62.192.228:/home/qutubk/
   ```

2. **SSH into your VPS:**
   ```bash
   ssh -i C:\Users\QK\.ssh\hostinger_ed25519 qutubk@72.62.192.228
   ```

3. **Run the HTTPS setup script:**
   ```bash
   sudo bash setup-https-pms.sh
   ```

4. **Update environment variables:**
   ```bash
   cd /var/www/sak-erp
   nano apps/web/.env.local
   # Update NEXT_PUBLIC_API_URL=/api/v1
   
   nano apps/api/.env
   # Update FRONTEND_URL=https://pms.saksolution.com
   # Update CORS_ORIGINS=https://pms.saksolution.com,https://www.pms.saksolution.com
   ```

5. **Redeploy the application:**
   From your local machine:
   ```powershell
   .\deploy-hostinger.ps1
   ```

---

## Troubleshooting

### DNS not resolving after 30 minutes?

**Check nameservers:**
```bash
dig saksolution.com NS
```

Make sure you're updating DNS records at the correct DNS provider (where your nameservers point).

### "DNS validation failed" error when running certbot?

1. Verify DNS is resolving correctly (use nslookup)
2. Wait a bit longer for DNS propagation
3. Make sure you're not behind a proxy/VPN that might cache old DNS

### SSL certificate not installing?

1. Check that ports 80 and 443 are open:
   ```bash
   sudo ufw status
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :443
   ```

2. Verify Nginx is running:
   ```bash
   sudo systemctl status nginx
   ```

3. Check Nginx error logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

---

## Current Status Check

Before proceeding with HTTPS setup, verify:

- [ ] DNS A records added for pms.saksolution.com
- [ ] DNS A records added for www.pms.saksolution.com  
- [ ] All records point to 72.62.192.228
- [ ] DNS propagation verified (nslookup or dnschecker.org)
- [ ] Waited at least 30 minutes after DNS changes
- [ ] PM2 is running (check: `pm2 status`)
- [ ] API is responding at http://72.62.192.228:4000/api/v1

Once all boxes are checked, proceed with the HTTPS setup script!
