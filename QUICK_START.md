# 🎯 Quick Start Guide - 5 Minutes Setup

## Prerequisites
- Node.js 20+ installed
- pnpm installed: `npm install -g pnpm`
- Docker Desktop running

## Setup Steps

### 1️⃣ Install Dependencies (2-3 minutes)
```powershell
pnpm install
```

### 2️⃣ Setup Environment
```powershell
cp .env.example .env
```

### 3️⃣ Start Infrastructure
```powershell
pnpm docker:dev
```

### 4️⃣ Setup Database
```powershell
cd packages/database
pnpm generate
pnpm migrate
pnpm seed
cd ../..
```

### 5️⃣ Start Application
```powershell
pnpm dev
```

## Access Points

- **Web App**: http://localhost:3000
- **API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api/docs
- **GraphQL**: http://localhost:4000/graphql

## Default Login
```
Email: admin@saifautomations.com
Password: Admin@123
```

## Need Help?

Read the full [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for detailed instructions.

## Quick Commands

```powershell
pnpm dev          # Start all services
pnpm docker:dev   # Start infrastructure
pnpm docker:down  # Stop infrastructure
pnpm db:studio    # Open database UI
pnpm build        # Build for production
```

---

**Happy Manufacturing! 🏭**
