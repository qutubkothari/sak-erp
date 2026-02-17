# Quick script to check production error logs
param(
    [int]$Lines = 50,
    [string]$Filter = 'issue-line|adjust_inventory|Inventory|ERROR|Error'
)

Write-Host "=== Checking sak-api error logs (last $Lines lines, filter: $Filter) ===" -ForegroundColor Cyan

$sshCmd = @"
tail -n $Lines ~/.pm2/logs/sak-api-error.log | grep -E '$Filter' || echo 'No matching errors found'
"@

ssh -o ConnectTimeout=10 qutubk@72.62.192.228 $sshCmd

Write-Host "`n=== Checking sak-api out logs (last $Lines lines, filter: $Filter) ===" -ForegroundColor Cyan

$sshCmdOut = @"
tail -n $Lines ~/.pm2/logs/sak-api-out.log | grep -E '$Filter' || echo 'No matching log entries found'
"@

ssh -o ConnectTimeout=10 qutubk@72.62.192.228 $sshCmdOut
