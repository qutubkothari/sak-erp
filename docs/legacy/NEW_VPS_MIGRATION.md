# New VPS migration runbook

Target new VPS:

- Host: `200.141.1.206`
- SSH user: `root`
- Test ERP path: `/var/www/sak-erp-test`
- Test web/API ports: `3001` / `4001`

## Purpose

Use the new VPS as a copy of the current test ERP first. The old VPS should eventually keep only:

1. live ERP
2. test ERP

Other applications can then be moved to the new VPS one by one.

## Current status

Completed on `2026-07-23`:

- Fresh VPS bootstrap completed.
- Current test ERP deployed to `/var/www/sak-erp-test`.
- PM2 processes online:
  - `sak-api-test` on port `4001`
  - `sak-web-test` on port `3001`
- Nginx IP proxy active.
- Upload storage copied from old test VPS:
  - old: `151M`, `321` files
  - new: `151M`, `321` files
- External checks:
  - `http://200.141.1.206/login` returns `200`
  - `http://200.141.1.206/api/v1/auth/me` returns `401` when not logged in, as expected
- Current test ERP was redeployed after the supplier-wise PO quotation fix and verified with:
  - old test VPS: `WEB_OK`
  - new VPS copy: `WEB_OK`
- New VPS backup point created:
  - `/root/sak-vps-backups/sak-erp-test-code-20260723-111445.tar.gz`
  - excludes `node_modules` and `.next/cache`
- New VPS rotating backup job added:
  - script: `/root/backup-sak-erp-test.sh`
  - schedule: daily `02:15`
  - log: `/root/sak-vps-backups/backup.log`
  - retention: deletes `sak-erp-test-code-*.tar.gz` older than 14 days
  - test run completed and created `/root/sak-vps-backups/sak-erp-test-code-20260723-111608.tar.gz`

Current browser URL for the copied test ERP:

```text
https://mizantra.saksolution.com
```

Temporary IP check URL:

```text
http://200.141.1.206
```

## Required SSH access

Add this public key to the new VPS root user in Hostinger SSH Keys, or append it to `/root/.ssh/authorized_keys`:

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEqHzmfmTJyp0tJNqIU1aoDbaA47eGLZ9R2ndxHboLhg hostinger-deployment
```

Verify access:

```powershell
ssh -o StrictHostKeyChecking=no -i "$env:USERPROFILE\.ssh\hostinger_ed25519" root@200.141.1.206 "hostname && df -h /"
```

## Bootstrap fresh VPS

Installs Node.js, pnpm, PM2, nginx, creates `/var/www/sak-erp-test`, and configures an IP-based nginx proxy.

```powershell
.\bootstrap-new-vps.ps1
```

## Deploy current test ERP to new VPS

This wrapper targets only `root@200.141.1.206:/var/www/sak-erp-test`.
It does not deploy to the old live/test VPS.

```powershell
.\deploy-new-vps-test.ps1
```

## Quick checks after deploy

```powershell
ssh -i "$env:USERPROFILE\.ssh\hostinger_ed25519" root@200.141.1.206 "pm2 list && curl -I http://127.0.0.1:3001 && curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1"
```

Browser check:

- `http://200.141.1.206`
- direct web port if needed: `http://200.141.1.206:3001`

## Notes

- DNS/SSL is intentionally not assumed yet. Once a domain/subdomain is assigned, add a named nginx server block and Let's Encrypt certificate.
- The test API env file is still sourced from `apps/api/.env.test`, so the new VPS copy points at the same test backend configuration unless that env file is changed before deployment.

## VPS inventory captured on 2026-07-23

### Old VPS: `72.62.192.228` / `srv1248004`

Disk:

- `/dev/sda1`: `96G` total, `77G` used, `20G` free, `80%` used

PM2 apps:

- `sak-api` — live ERP API
- `sak-web` — live ERP web
- `sak-api-test` — test ERP API
- `sak-web-test` — test ERP web
- `sak-jewelry` — non-ERP app still on old VPS

Largest `/var/www` folders:

- `/var/www/sak-erp-test` — `14G`
- `/var/www/sak-erp` — `3.1G`
- `/var/www/salesmate-ai` — `2.4G`
- `/var/www/sak-hr` — `2.1G`
- `/var/www/salesmate-ai-backup` — `1.7G`
- `/var/www/solar-epc` — `1.5G`
- `/var/www/sakfasteners` — `775M`
- `/var/www/sak-sms` — `685M`
- `/var/www/sak-jewelry` — `622M`

Enabled nginx/cert domains include:

- `pms.saksolution.com`
- `pmstest.saksolution.com`
- `sakjewels.ae`
- `sakjewels.com`
- `sakhr.saksolution.com`
- `sakaccounts.saksolution.com`
- `salesmate.saksolution.com`
- `sms.saksolution.com`
- `lms.saksolution.com`
- `gripitscales.com`
- `epc.saksolution.com`
- `amz.saksolution.com`
- `nexus.saksolution.com`
- `naqla.saksolution.com`
- `sak-ai.saksolution.com`
- `sak-ai.saksolution.ae`
- `pdf.saksolution.com`

Cron jobs currently exist on the old VPS for reminder/WAHA polling and `sak-accounts-smart` backups. Do not remove old apps until their cron behavior is understood and moved if required.

### New VPS: `200.141.1.206` / `srv1846920`

Disk:

- `/dev/sda1`: `96G` total, about `4.7G` used after backup, about `92G` free

PM2 apps:

- `sak-api-test` — copied test ERP API
- `sak-web-test` — copied test ERP web

Nginx:

- IP-based test ERP proxy is enabled:
  - `/etc/nginx/sites-enabled/sak-erp-test-ip.conf`
- Named domain proxy is enabled:
  - `/etc/nginx/sites-enabled/mizantra.saksolution.com.conf`
  - routes `/` to web port `3001`
  - routes `/api/` to API port `4001`

Let's Encrypt:

- `mizantra.saksolution.com`
- certificate path: `/etc/letsencrypt/live/mizantra.saksolution.com/fullchain.pem`
- expires: `2026-10-21`
- certbot auto-renew task installed

Public checks:

- `http://mizantra.saksolution.com/login` redirects to HTTPS
- `https://mizantra.saksolution.com/login` returns `200`

Cron:

- Daily test ERP backup is configured:
  - `15 2 * * * /root/backup-sak-erp-test.sh >> /root/sak-vps-backups/backup.log 2>&1`

## Recommended next migration order

1. Treat `pmstest.saksolution.com` as the live/current client ERP unless explicitly told otherwise.
2. Treat `mizantra.saksolution.com` as the real test/UAT ERP on the new VPS.
3. Do not run mutating smoke tests or trial deployments against `pmstest.saksolution.com`; use `mizantra.saksolution.com` for that work.
2. Move one non-ERP app at a time to new VPS, starting with the smallest/lowest-risk apps:
   - `sak-lms`
   - `sak-ai.saksolution.com`
   - `fsm-pwa`
   - `sakaccounts` / `sak-accounts-smart`
   - `sak-sms`
   - `sak-jewelry`
3. For each app:
   - copy code/assets/data to new VPS
   - reproduce env variables
   - install dependencies
   - start under PM2 with a new app name
   - add nginx config
   - test by IP/temporary host header
   - then change DNS
   - only after DNS and smoke tests pass, stop/remove old VPS copy
4. Keep separate backups for:
   - live ERP
   - test ERP
   - each moved app
