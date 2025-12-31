# ✅ READY TO DEPLOY - Copy & Paste Commands

## 🚀 Quick Deployment (Copy these commands)

Connect to server via PuTTY (13.205.17.214, user: ubuntu), then run:

```bash
cd /home/ubuntu/sak-erp && \
git pull origin production-clean && \
cd apps/api && npm run build && pm2 restart sak-api && \
cd ../web && npm run build && pm2 restart sak-web && \
pm2 status
```

## ✅ What Just Got Deployed

### Git Push: SUCCESS ✅
- Commit: `98cfbf2`
- Branch: `production-clean`
- Files: 8 files changed, 2,251 insertions
- Status: Pushed to GitHub

### New Features:
1. 📧 **Email Integration** - Send debit notes to suppliers
2. 💳 **Payment Recording** - Track GRN payments with method/reference
3. 📊 **Enhanced UI** - Professional email templates and payment modal

### Files Deployed:
- `apps/api/src/purchase/services/debit-note.service.ts` (448 lines)
- `apps/api/src/purchase/controllers/debit-note.controller.ts` (95 lines)
- `apps/api/src/email/email.service.ts` (updated)
- `apps/web/src/app/dashboard/purchase/debit-notes/page.tsx` (updated)
- `apps/web/src/app/dashboard/accounts/payables/page.tsx` (460 lines)
- `add-grn-payment-tracking.sql` (payment schema)

## 🔍 Verify After Deployment

```bash
# Check services are running
pm2 status

# View recent logs
pm2 logs sak-api --lines 20
pm2 logs sak-web --lines 20

# Test API
curl http://localhost:4000/health
```

## 🌐 Access Your System

- **Debit Notes**: http://13.205.17.214:3000/dashboard/purchase/debit-notes
- **Accounts Payable**: http://13.205.17.214:3000/dashboard/accounts/payables

## 💡 Complete Documentation

See `DEPLOY_EMAIL_PAYMENT.md` and `COMPLETE_SYSTEM_SUMMARY.md` for full details.
