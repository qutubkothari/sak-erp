# Dual Environment Setup

This repo now supports two Hostinger deployments on the same VPS:

1. Live
   Frontend: https://pms.saksolution.com
   API: https://pms.saksolution.com/api/v1
   Ports: web 3000, api 4000
   PM2: sak-web, sak-api
   Remote path: /var/www/sak-erp

2. Test
   Frontend: https://pmstest.saksolution.com
   API: https://pmstest.saksolution.com/api/v1
   Ports: web 3001, api 4001
   PM2: sak-web-test, sak-api-test
   Remote path: /var/www/sak-erp-test

## Required API env files

Create these local files before deploying:

1. apps/api/.env
   Use the live database, live frontend URL, and live OAuth redirect URIs.

2. apps/api/.env.test
   Use a separate test database and test URLs.

Minimum values for each env file:

```env
SUPABASE_URL=
SUPABASE_KEY=
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
FRONTEND_URL=https://your-domain
CORS_ORIGINS=https://your-domain
GMAIL_REDIRECT_URI=https://your-domain/api/v1/auth/google/callback
NODE_ENV=production
```

Do not point the test env file at the live database.

## Deploy commands

Live:

```powershell
./deploy-hostinger-live.ps1
```

Test:

```powershell
./deploy-hostinger-test.ps1
```

You can also call the main script directly:

```powershell
./deploy-hostinger.ps1 -Environment live
./deploy-hostinger.ps1 -Environment test
```

## DNS records

Add these A records to 72.62.192.228:

1. pms.saksolution.com
2. www.pms.saksolution.com
3. pmstest.saksolution.com
4. www.pmstest.saksolution.com

## Nginx

Use the template in [sak-erp-dual-env.nginx.conf](sak-erp-dual-env.nginx.conf) as the server config.

Typical steps on the VPS:

```bash
sudo cp sak-erp-dual-env.nginx.conf /etc/nginx/sites-available/sak-erp
sudo ln -s /etc/nginx/sites-available/sak-erp /etc/nginx/sites-enabled/sak-erp
sudo nginx -t
sudo systemctl reload nginx
```

## SSL

After DNS resolves, issue certificates for the site hostnames:

```bash
sudo certbot --nginx \
  -d pms.saksolution.com \
  -d www.pms.saksolution.com \
  -d pmstest.saksolution.com \
   -d www.pmstest.saksolution.com
```

## Notes

1. Live and test are isolated by remote path, PM2 process name, web port, and API port.
2. The test web build proxies to port 4001, not the live API.
3. Keep separate databases for live and test.