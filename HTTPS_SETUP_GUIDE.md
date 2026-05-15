# HTTPS/SSL Certificate Setup Guide for Hostinger VPS

## Domain: pms.saksolution.com

### Complete Duplicate Detection System Deployment Status ✅

**Your Production URLs (after HTTPS setup):**
- Frontend: https://pms.saksolution.com
- API: https://pms.saksolution.com/api/v1
- Alias: https://erp.saifseas.com
- HR Module: https://pms.saksolution.com/dashboard/hr

### What's Now Live:
- **Backend API**: http://72.62.192.228:4000/api/v1 ✅ DEPLOYED
- **Frontend**: Pending (build errors with unused variables in GRN page)
- **Duplicate Detection**: 100% backend complete, 100% frontend code complete

---

## HTTPS Setup with Let's Encrypt (Free SSL)

### Prerequisites:
- Domain name pointed to your Hostinger VPS IP: `72.62.192.228`
- Root/sudo access to the VPS
- Nginx or Apache web server

### Step 1: Install Certbot

SSH into your Hostinger VPS:
```bash
ssh -i C:\Users\QK\.ssh\hostinger_ed25519 qutubk@72.62.192.228
```

Install Certbot for Nginx:
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

Or for Apache:
```bash
sudo apt update
sudo apt install certbot python3-certbot-apache
```

### Step 2: Configure Nginx Reverse Proxy

Create Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/sak-erp
```

Add this configuration for **pms.saksolution.com**:
```nginx
# Main site server block
server {
    listen 80;
    server_name pms.saksolution.com www.pms.saksolution.com erp.saifseas.com;

    location = /api {
        return 308 /api/v1;
    }

    location = /api/v1 {
        return 308 /api/v1/;
    }

    location /api/v1/ {
        proxy_pass http://localhost:4000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/sak-erp /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### Step 3: Obtain SSL Certificate

Run Certbot to get and install SSL certificate:
```bash
# For Nginx (your setup)
sudo certbot --nginx -d pms.saksolution.com -d www.pms.saksolution.com -d erp.saifseas.com
```

Or for Apache:
```bash
sudo certbot --apache -d pms.saksolution.com -d www.pms.saksolution.com -d erp.saifseas.com
```

Certbot will:
- Obtain SSL certificates from Let's Encrypt
- Automatically configure Nginx/Apache
- Set up HTTPS redirects
- Store certificates in `/etc/letsencrypt/live/your-domain.com/`

### Step 4: Verify HTTPS is Working

Test your sites:
- Frontend: https://pms.saksolution.com
- API: https://pms.saksolution.com/api/v1
- Alias: https://erp.saifseas.com

### Step 5: Auto-Renewal Setup

Let's Encrypt certificates expire every 90 days. Certbot automatically sets up renewal.

Test renewal:
```bash
sudo certbot renew --dry-run
```

Check renewal timer:
```bash
sudo systemctl status certbot.timer
```

---

## DNS Configuration

### Hostinger DNS Settings:

Add these A records in your domain's DNS settings:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 72.62.192.228 | 3600 |
| A | www | 72.62.192.228 | 3600 |

Wait 10-30 minutes for DNS propagation.

---

## Firewall Configuration

Allow HTTPS traffic:
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## PM2 Configuration for Auto-Start

Ensure PM2 starts on system boot:
```bash
pm2 startup
# Follow the command it outputs
pm2 save
```

---

## Troubleshooting

### Issue: "Connection refused" or "502 Bad Gateway"
```bash
# Check if services are running
pm2 status
curl http://localhost:3000
curl http://localhost:4000/api/v1

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Issue: SSL certificate not working
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew
```

### Issue: Domain not resolving
```bash
# Check DNS propagation
nslookup your-domain.com
dig your-domain.com

# Wait 10-30 minutes for DNS changes to propagate
```

---

## Environment Variables Update

After setting up HTTPS, update your `.env` files:

**apps/web/.env.local**:
```env
NEXT_PUBLIC_API_URL=/api/v1
```

**apps/api/.env**:
```env
FRONTEND_URL=https://pms.saksolution.com
CORS_ORIGINS=https://pms.saksolution.com,https://www.pms.saksolution.com
```

Redeploy after updating:
```powershell
.\deploy-hostinger.ps1
```

---

## Complete Deployment Checklist

- [x] Backend API deployed to Hostinger (100%)
- [x] Duplicate detection service running
- [x] PM2 process manager configured
- [ ] Fix GRN page unused variables (frontend build)
- [ ] Domain name configured
- [ ] DNS A records added
- [ ] Nginx reverse proxy configured
- [ ] SSL certificates obtained via Let's Encrypt
- [ ] HTTPS redirects enabled
- [ ] Environment variables updated
- [ ] Frontend deployed
- [ ] Firewall rules configured
- [ ] PM2 auto-start enabled
- [ ] SSL auto-renewal tested
- [ ] Production testing complete

---

## Quick HTTPS Setup Commands (Summary)

```bash
# 1. SSH into VPS
ssh -i C:\Users\QK\.ssh\hostinger_ed25519 qutubk@72.62.192.228

# 2. Install Certbot
sudo apt update && sudo apt install certbot python3-certbot-nginx -y

# 3. Configure Nginx (see Step 2 above)
sudo nano /etc/nginx/sites-available/sak-erp
sudo ln -s /etc/nginx/sites-available/sak-erp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 4. Obtain SSL Certificate
sudo certbot --nginx -d pms.saksolution.com -d www.pms.saksolution.com -d erp.saifseas.com

# 5. Test Auto-Renewal
sudo certbot renew --dry-run

# 6. Configure Firewall
sudo ufw allow 'Nginx Full'
sudo ufw enable

# 7. Done! Visit https://pms.saksolution.com
```

---

## Support Resources

- Let's Encrypt Docs: https://letsencrypt.org/docs/
- Certbot Docs: https://certbot.eff.org/
- Nginx Docs: https://nginx.org/en/docs/
- Hostinger VPS Support: https://www.hostinger.com/tutorials/vps

---

## Current System Status

**Production URLs** (after HTTPS setup):
- Frontend: https://pms.saksolution.com
- API: https://pms.saksolution.com/api/v1
- Alias: https://erp.saifseas.com
- HR Module: https://pms.saksolution.com/dashboard/hr

**Current HTTP URLs** (temporary):
- Frontend: http://72.62.192.228:3000 (build errors)
- API: http://72.62.192.228:4000/api/v1 ✅ WORKING
- HR: http://72.62.192.228:3000/dashboard/hr

**Duplicate Detection Status:**
- Backend: 100% complete (8/8 controllers) ✅
- Frontend: 50% complete (3/6 forms) ⏳
  - ✅ Vendors
  - ✅ Items  
  - ✅ Sales (Customers, Quotations, Sales Orders)
  - ⏳ Purchase Orders (needs frontend build fix)
  - ⏳ GRNs (needs frontend build fix)
  - ⏳ Purchase Requisitions (needs frontend build fix)

---

**Next Steps:**
1. Fix GRN page unused variables to enable frontend build
2. Purchase a domain name (e.g., sak-erp.com)
3. Point domain DNS to 72.62.192.228
4. Follow HTTPS setup steps above
5. Deploy frontend with updated environment variables
