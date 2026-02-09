# Data Deletion and Reimport Scripts

This directory contains scripts to delete and reimport items, vendors, and BOMs.

## Files Created

### SQL Scripts
- **delete-items-vendors-boms.sql** - SQL script that deletes all items, vendors, and BOMs with proper cascade handling

### PowerShell Scripts
- **delete-only.ps1** - Deletes data without reimporting
- **reimport-all-data.ps1** - Complete workflow: delete + reimport everything

### Existing Import Scripts
- **import-master-data.js** - Imports vendors and items from master-items-processed.json
- **import-boms.js** - Imports BOMs from Excel file

## Quick Start

### Option 1: Complete Reimport (Recommended)
```powershell
.\reimport-all-data.ps1
```
This will:
1. Delete all existing items, vendors, and BOMs
2. Import fresh vendors and items
3. Import fresh BOMs

### Option 2: Delete Only
```powershell
.\delete-only.ps1
```
Then manually run imports:
```powershell
node import-master-data.js
node import-boms.js
```

## Prerequisites

1. **Environment Configuration**
   - Ensure `apps/api/.env` contains:
     ```
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_KEY=your-service-role-key
     ```

2. **Required Files**
   - `master-items-processed.json` - Processed items data
   - `3. Master List of Raw Material Saif Automations (1).xlsx` - BOM Excel file

3. **Database Backup** ⚠️
   - Always backup your database before running deletion scripts!

## What Gets Deleted

The deletion script removes:
- ✗ Items (all types)
- ✗ Vendors
- ✗ BOM Headers & Items
- ✗ Item-Vendor relationships
- ✗ Purchase Orders & Items
- ✗ Purchase Requisitions & Items
- ✗ GRNs & Items
- ✗ Stock Entries
- ✗ UID Registry entries
- ✗ Quotations & Items
- ✗ Sales Orders & Items
- ✗ Production Orders
- ✗ All related transaction data

## Safety Features

- Double confirmation required
- Transaction-based deletion (can rollback on error)
- Shows before/after counts
- Comprehensive error handling
- Exit codes for automation

## Troubleshooting

### "SUPABASE_URL or SUPABASE_KEY missing"
Check `apps/api/.env` for correct configuration

### "SQL file not found"
Run from the sak-erp root directory

### "Import failed"
Check:
- Network connectivity
- Database permissions
- Excel file exists and is readable
- JSON file is valid

## Manual Database Execution

If you prefer to run SQL directly:

```bash
# Via Supabase Dashboard
1. Copy contents of delete-items-vendors-boms.sql
2. Go to SQL Editor in Supabase
3. Paste and Run

# Via psql
psql -h your-host -U postgres -d postgres -f delete-items-vendors-boms.sql

# Via Node.js
node scripts/apply-sql-supabase.js delete-items-vendors-boms.sql
```

## Exit Codes

- `0` - Success
- `1` - Error occurred (check error message)

## Logs

Import results are saved to:
- `import-log.json` - Master data import log
- `bom-import-log.json` - BOM import log
