# Hostinger Deploy And Rollback Runbook

## Current Release

- Deploy date: 2026-03-29
- Artifact uploaded: `deploy-20260329-145758.tar.gz`
- Explicit pre-deploy backup: `predeploy-20260329-144853.tar.gz`
- Deploy health markers: `WEB_OK`, `API_OK_404`

## Live Endpoints

- Frontend: `http://72.62.192.228:3000/`
- Login: `http://72.62.192.228:3000/login`
- Build ID: `http://72.62.192.228:3000/api/build-id`
- API status: `http://72.62.192.228:4000/api/v1/migrate/status`

## Deploy

Run the artifact deploy from the repo root:

```powershell
.\deploy-hostinger.ps1
```

What it does:

- Builds `packages/hr-module`, `apps/web`, and `apps/api` locally
- Uploads a tarball to Hostinger
- Extracts into `/var/www/sak-erp`
- Runs `pnpm install --frozen-lockfile`
- Regenerates Prisma client
- Restarts PM2 apps `sak-api` and `sak-web`
- Performs local VPS health checks

## List Backups

Use the rollback helper to list all available restore points:

```powershell
.\rollback-hostinger.ps1 -ListBackups
```

## Roll Back This Release

Restore the explicit pre-deploy snapshot created before the current release:

```powershell
.\rollback-hostinger.ps1 -BackupName predeploy-20260329-144853.tar.gz
```

The rollback helper will:

- Stop PM2 apps `sak-web` and `sak-api`
- Restore the selected backup into `/var/www/sak-erp`
- Reinstall dependencies
- Regenerate Prisma client
- Restart `sak-api` and `sak-web`
- Recheck web and API reachability

## Post-Deploy Verification

Minimum verification after deploy or rollback:

```text
GET http://72.62.192.228:3000/
GET http://72.62.192.228:3000/login
GET http://72.62.192.228:3000/api/build-id
GET http://72.62.192.228:4000/api/v1/migrate/status
```

Expected current API status response shape:

```json
{"status":"Migration service ready","timestamp":"..."}
```

## Notes

- `deploy-github-and-hostinger.ps1` is not safe for selective deployment from a dirty worktree because it auto-stages and commits all changes.
- Prefer `deploy-hostinger.ps1` for artifact-based deploys when the checkout contains unrelated local changes.
- `API_OK_404` is acceptable in the deploy output because it confirms the API process responded.