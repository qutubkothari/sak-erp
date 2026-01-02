# 🚀 Deploy BOM Edit Feature

**Date:** December 27, 2025  
**Feature:** Edit BOM directly from cards + Edit button in details modal  
**Commit:** `4055cd4`  
**Branch:** `production-clean` ✅ PUSHED

---

## ✅ Changes Committed & Pushed

The following changes are now in GitHub on `production-clean` branch:

- **Edit Button on Cards**: Each BOM card now has an "Edit" button alongside View/Routing/Generate PR
- **Edit Modal Mode**: Opens the create modal pre-filled with BOM data
- **Update API Call**: Saves changes via `PUT /api/v1/bom/:id`
- **Disabled Fields**: Finished Product and Version are read-only in edit mode

---

## 📋 Deployment Steps

### Option 1: SSH from Terminal (if port 22 is open)

```bash
ssh -i saif-erp.pem ubuntu@13.205.17.214
cd /home/ubuntu/sak-erp
git pull origin production-clean
pm2 restart sak-web
pm2 logs sak-web --lines 20
```

### Option 2: Using PuTTY (Windows)

1. **Open PuTTY**
   - Host: `13.205.17.214`
   - Port: `22`
   - Connection > SSH > Auth > Private key: Browse to `saif-erp.pem` (convert to .ppk if needed)
   - Click "Open"

2. **Login as:** `ubuntu`

3. **Run these commands:**
```bash
cd /home/ubuntu/sak-erp
git pull origin production-clean
pm2 restart sak-web
pm2 status
```

### Option 3: Mobile Hotspot + PowerShell

If your office network blocks SSH:

1. Connect PC to mobile hotspot
2. Run in PowerShell:
```powershell
cd "C:\Users\musta\OneDrive\Documents\GitHub\Manufacturing ERP"
ssh -i .\saif-erp.pem ubuntu@13.205.17.214
```
3. Then execute commands from Option 1

---

## 🔍 Verify Deployment

After restarting, check:

1. **Web app is running:**
```bash
pm2 status
# sak-web should show "online"
```

2. **Test the feature:**
   - Open: http://13.205.17.214:3000/dashboard/bom
   - Create a BOM if none exist
   - Click "Edit" button on a BOM card
   - Verify modal opens with pre-filled data
   - Make a change and click "Save Changes"
   - Verify BOM updates successfully

---

## ⚠️ Troubleshooting

### If git pull fails with conflicts:
```bash
cd /home/ubuntu/sak-erp
git fetch origin
git reset --hard origin/production-clean
pm2 restart sak-web
```

### If pm2 restart doesn't work:
```bash
pm2 delete sak-web
cd /home/ubuntu/sak-erp/apps/web
pm2 start npm --name "sak-web" -- run dev
pm2 save
```

### If you see "connection refused" on port 3000:
```bash
# Check logs
pm2 logs sak-web

# Check if port is in use
sudo lsof -i :3000

# Restart if needed
pm2 restart sak-web
```

---

## 📝 What's New for Testing

### Edit from Card
1. Go to BOM list
2. Find any BOM
3. **Click "Edit" button** (new amber button)
4. Modal opens with:
   - Finished Product field (disabled/read-only)
   - Version field (disabled/read-only)  
   - All components pre-filled
   - Effective dates pre-filled
   - Notes pre-filled
5. Modify components (add/remove/change quantities)
6. Click "Save Changes"
7. BOM updates in list

### Edit from Details
1. Click "View Details" on any BOM
2. **Click "Edit BOM" button** (new button in footer)
3. Same edit modal opens
4. Make changes and save

---

## 🎯 API Endpoint Used

```
PUT /api/v1/bom/:id
```

Request body:
```json
{
  "itemId": "uuid",
  "version": 1,
  "effectiveFrom": "2025-12-27",
  "effectiveTo": null,
  "notes": "Updated notes",
  "items": [
    {
      "componentType": "ITEM",
      "itemId": "uuid",
      "quantity": 5,
      "scrapPercentage": 2,
      "sequence": 1,
      "notes": "Component notes",
      "drawingUrl": "https://..."
    }
  ]
}
```

---

**Ready to test once deployed!** 🚀
