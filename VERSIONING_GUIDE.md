# 📦 SAK ERP Versioning & Restore Guide

## Automatic Versioning

Every push to `main` automatically creates a new version tag:
- **v1.0.0** → **v1.0.1** (patch increment)
- **v1.0.1** → **v1.1.0** (minor increment for features)
- **v1.1.0** → **v2.0.0** (major increment for breaking changes)

Versions are visible at: https://github.com/qutubkothari/sak-erp/releases

---

## 🔄 How to Restore to Any Version

### Method 1: Using PowerShell Script (Recommended)

```powershell
# Restore to a specific version (creates a new branch)
.\restore-version.ps1 -Version "v1.2.3" -CreateBranch

# Restore without creating branch (detached HEAD)
.\restore-version.ps1 -Version "v1.2.3"

# Force restore without confirmation
.\restore-version.ps1 -Version "v1.2.3" -Force
```

### Method 2: Using Git Commands

```bash
# See all available versions
git tag -l | sort -V

# Restore to a version (creates branch)
git fetch origin
git checkout -b restore-v1.2.3 v1.2.3

# Or checkout directly (detached HEAD)
git checkout v1.2.3

# Go back to main
git checkout main
```

---

## 📊 Version History

View all releases: https://github.com/qutubkothari/sak-erp/releases

Each release includes:
- ✅ Complete code snapshot
- ✅ Database backup (separate workflow)
- ✅ Change summary
- ✅ Restore commands

---

## 🗄️ Database Backups

Database backups run separately from code versioning:
- **Daily at midnight UTC** - Automatic
- **Manual trigger** - Anytime via GitHub Actions
- **Stored as** GitHub Release artifacts (free)

### Restore Database from Backup:

```bash
# Download backup from GitHub Releases
# Extract the .sql.gz file
# Restore to database:
psql -h db.nwkaruzvzwwuftjquypk.supabase.co -U postgres -d postgres < backup-file.sql
```

---

## 🚨 Emergency Recovery

### Scenario 1: Code is broken
```powershell
# Quick rollback to last known good version
.\restore-version.ps1 -Version "v1.2.3" -CreateBranch
```

### Scenario 2: Database corrupted
```bash
# 1. Restore code to stable version
git checkout v1.2.3

# 2. Download database backup from GitHub Release
# 3. Restore database using psql or pgAdmin
```

### Scenario 3: Complete disaster
1. Clone fresh: `git clone https://github.com/qutubkothari/sak-erp.git`
2. Checkout version: `git checkout v1.2.3`
3. Download database backup
4. Restore database

---

## 📝 Manual Version Tagging

For important milestones, create manual versions:

```bash
# Create annotated tag
git tag -a v2.0.0 -m "Major release: New security features"

# Push tag to GitHub
git push origin v2.0.0

# GitHub will auto-create a Release
```

---

## 🔒 Best Practices

1. **Always create a branch when restoring**
   - Don't work directly on old versions
   - Test first, then merge to main

2. **Tag important milestones**
   - Before major changes
   - After successful deployments
   - When stock/system is stable

3. **Keep database backups**
   - Verify backups are working
   - Test restore process occasionally

4. **Document changes**
   - Write clear commit messages
   - They appear in release notes

---

## 📞 Quick Reference

| Action | Command |
|--------|---------|
| See versions | `git tag -l` or GitHub Releases |
| Restore to version | `.\restore-version.ps1 -Version v1.2.3` |
| Create backup | GitHub Actions → Database Backup → Run workflow |
| Download backup | GitHub Releases → Assets |
| View changes | `git log v1.2.0..v1.2.1` |

---

## Current Status

- **Code**: Backed up to GitHub with automatic versioning
- **Database**: Daily automated backups (set up secrets to enable)
- **Restore**: One-click restore to any version

**You're now protected! 🛡️**
