param(
  [string]$BackupName,
  [switch]$ListBackups
)

$ErrorActionPreference = "Stop"

$HOSTINGER_IP = if ($env:HOSTINGER_IP) { $env:HOSTINGER_IP } else { "72.62.192.228" }
$HOSTINGER_USER = if ($env:HOSTINGER_USER) { $env:HOSTINGER_USER } else { "qutubk" }
$KEY_PATH = if ($env:HOSTINGER_KEY_PATH) {
  $env:HOSTINGER_KEY_PATH
} else {
  $preferred = "$env:USERPROFILE\.ssh\hostinger_ed25519"
  if (Test-Path $preferred) {
    $preferred
  } else {
    "$env:USERPROFILE\.ssh\id_ed25519"
  }
}

$REMOTE_PATH = if ($env:HOSTINGER_REMOTE_PATH) { $env:HOSTINGER_REMOTE_PATH } else { "/var/www/sak-erp" }
$PM2_API_NAME = "sak-api"
$PM2_WEB_NAME = "sak-web"

function Assert-CommandExists($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Required command not found: $name"
  }
}

function Run($label, $scriptBlock) {
  Write-Host "`n=== $label ===" -ForegroundColor Cyan
  & $scriptBlock
}

function Invoke-Ssh($remoteCommand) {
  & ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=20 -i $KEY_PATH "$HOSTINGER_USER@$HOSTINGER_IP" $remoteCommand
}

Run "Preflight" {
  if (-not (Test-Path $KEY_PATH)) {
    throw "SSH key not found at: $KEY_PATH"
  }

  Assert-CommandExists "ssh"

  Write-Host "Using SSH key: $KEY_PATH" -ForegroundColor Gray
  Write-Host "Hostinger VPS: $HOSTINGER_USER@$HOSTINGER_IP" -ForegroundColor Gray
  Write-Host "Remote path: $REMOTE_PATH" -ForegroundColor Gray
}

if ($ListBackups) {
  Run "Available backups" {
    $remoteCmd = 'cd "' + $REMOTE_PATH + '" && ls -1t predeploy-*.tar.gz backup-*.tar.gz 2>/dev/null || echo NO_BACKUPS_FOUND'
    $escapedCmd = $remoteCmd.Replace("'", "'\\''")
    Invoke-Ssh "bash -lc '$escapedCmd'" | Out-Host
  }
  exit 0
}

if ([string]::IsNullOrWhiteSpace($BackupName)) {
  throw "BackupName is required. Example: .\rollback-hostinger.ps1 -BackupName predeploy-20260329-144853.tar.gz"
}

Run "Rollback on Hostinger" {
  $remoteCmd =
    ('set -e; ' +
     'DEPLOY_DIR=' + $REMOTE_PATH + '; ' +
     'BACKUP_NAME=' + $BackupName + '; ' +
     'cd "$DEPLOY_DIR"; ' +
     'if [ ! -f "$BACKUP_NAME" ]; then echo "BACKUP_NOT_FOUND:$BACKUP_NAME"; exit 1; fi; ' +
     'pm2 stop ' + $PM2_WEB_NAME + ' 2>/dev/null || true; ' +
     'pm2 stop ' + $PM2_API_NAME + ' 2>/dev/null || true; ' +
     'rm -rf apps packages package.json pnpm-workspace.yaml pnpm-lock.yaml 2>/dev/null || true; ' +
     'tar -xzf "$BACKUP_NAME" -C "$DEPLOY_DIR"; ' +
     'pnpm install --frozen-lockfile; ' +
     'cd packages/database; pnpm exec prisma generate --schema prisma/schema.prisma; cd "$DEPLOY_DIR"; ' +
     'pm2 delete ' + $PM2_API_NAME + ' 2>/dev/null || true; ' +
     'cd apps/api; pm2 start npm --name ' + $PM2_API_NAME + ' -- run start:prod; cd "$DEPLOY_DIR"; ' +
     'pm2 delete ' + $PM2_WEB_NAME + ' 2>/dev/null || true; ' +
     'cd apps/web; ' +
     'if [ -f .next/BUILD_ID ]; then ' +
     '  pm2 start node_modules/next/dist/bin/next --name ' + $PM2_WEB_NAME + ' -- start -p 3000; ' +
     'else ' +
     '  pm2 start npm --name ' + $PM2_WEB_NAME + ' -- run dev -- -p 3000; ' +
     'fi; ' +
     'cd "$DEPLOY_DIR"; ' +
     'pm2 save; ' +
     'WEB_OK=0; for i in 1 2 3 4 5 6 7 8 9 10; do if curl -fs http://127.0.0.1:3000/ >/dev/null 2>&1; then WEB_OK=1; break; fi; sleep 1; done; if [ "$WEB_OK" -eq 1 ]; then echo WEB_OK; else echo WEB_FAIL; fi; ' +
     'API_CODE=000; for i in 1 2 3 4 5 6 7 8 9 10; do API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/api/v1 2>/dev/null || true); if [ "$API_CODE" != "000" ]; then break; fi; sleep 1; done; if [ "$API_CODE" != "000" ]; then echo API_OK_$API_CODE; else echo API_FAIL; fi; ' +
     'pm2 list')

  $escapedCmd = $remoteCmd.Replace("'", "'\\''")
  Invoke-Ssh "bash -lc '$escapedCmd'" | Out-Host
}

Run "Done" {
  Write-Host "Rollback Complete!" -ForegroundColor Green
  Write-Host "Restored backup: $BackupName" -ForegroundColor Green
  Write-Host "Frontend: http://${HOSTINGER_IP}:3000" -ForegroundColor Green
  Write-Host "API:      http://${HOSTINGER_IP}:4000/api/v1" -ForegroundColor Green
}