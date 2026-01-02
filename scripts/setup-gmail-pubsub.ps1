#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Set up GCP Pub/Sub for Gmail push notifications
.DESCRIPTION
    Creates Pub/Sub topic, grants permissions to Gmail API, creates push subscription
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "sak-erp-482505",
    
    [Parameter(Mandatory=$false)]
    [string]$TopicName = "gmail-notifications",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionName = "gmail-push-sub",
    
    [Parameter(Mandatory=$false)]
    [string]$WebhookUrl = "https://erp.saksolution.com/api/v1/webhooks/gmail",
    
    [Parameter(Mandatory=$false)]
    [string]$Ec2Ip = "3.110.100.60",
    
    [Parameter(Mandatory=$false)]
    [string]$Ec2User = "ubuntu",
    
    [Parameter(Mandatory=$false)]
    [string]$KeyPath = ".\saif-erp.pem"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Gmail Pub/Sub Setup ===" -ForegroundColor Cyan

# 1. Create Pub/Sub topic
Write-Host "`n1. Creating Pub/Sub topic: $TopicName" -ForegroundColor Yellow
$createTopicCmd = "gcloud pubsub topics create $TopicName --project=$ProjectId 2>&1"
$result = Invoke-Expression $createTopicCmd
if ($LASTEXITCODE -ne 0 -and $result -notmatch "already exists") {
    Write-Host "Error creating topic: $result" -ForegroundColor Red
    exit 1
}
Write-Host "Topic created/exists: projects/$ProjectId/topics/$TopicName" -ForegroundColor Green

# 2. Grant publisher role to Gmail API service account
Write-Host "`n2. Granting publisher role to gmail-api-push@system.gserviceaccount.com" -ForegroundColor Yellow
$grantCmd = "gcloud pubsub topics add-iam-policy-binding $TopicName --member=serviceAccount:gmail-api-push@system.gserviceaccount.com --role=roles/pubsub.publisher --project=$ProjectId 2>&1"
$result = Invoke-Expression $grantCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error granting permissions: $result" -ForegroundColor Red
    exit 1
}
Write-Host "Permissions granted successfully" -ForegroundColor Green

# 3. Delete existing subscription if any (to update endpoint)
Write-Host "`n3. Checking for existing subscription" -ForegroundColor Yellow
$deleteSubCmd = "gcloud pubsub subscriptions delete $SubscriptionName --project=$ProjectId --quiet 2>&1"
Invoke-Expression $deleteSubCmd | Out-Null
Write-Host "Old subscription deleted (if existed)" -ForegroundColor Green

# 4. Create push subscription
Write-Host "`n4. Creating push subscription to: $WebhookUrl" -ForegroundColor Yellow
$createSubCmd = "gcloud pubsub subscriptions create $SubscriptionName --topic=$TopicName --push-endpoint=$WebhookUrl --project=$ProjectId 2>&1"
$result = Invoke-Expression $createSubCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error creating subscription: $result" -ForegroundColor Red
    exit 1
}
Write-Host "Subscription created: projects/$ProjectId/subscriptions/$SubscriptionName" -ForegroundColor Green

# 5. Set GMAIL_PUBSUB_TOPIC in .env on EC2
Write-Host "`n5. Updating .env on EC2" -ForegroundColor Yellow
$topicFullName = "projects/$ProjectId/topics/$TopicName"
$envUpdateCmd = @"
cd /home/ubuntu/sak-erp/apps/api && \
grep -v '^GMAIL_PUBSUB_TOPIC=' .env > .env.tmp && \
echo 'GMAIL_PUBSUB_TOPIC=$topicFullName' >> .env.tmp && \
mv .env.tmp .env && \
pm2 restart sak-api && \
echo 'GMAIL_PUBSUB_TOPIC set successfully'
"@

ssh -i $KeyPath "$Ec2User@$Ec2Ip" $envUpdateCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error updating .env on EC2" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "`nPub/Sub Configuration:" -ForegroundColor Cyan
Write-Host "  Topic: projects/$ProjectId/topics/$TopicName"
Write-Host "  Subscription: projects/$ProjectId/subscriptions/$SubscriptionName"
Write-Host "  Webhook: $WebhookUrl"
Write-Host "`nNext step: Call the watch endpoint to start receiving notifications" -ForegroundColor Yellow
