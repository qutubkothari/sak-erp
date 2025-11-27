# 🚀 Saif Automations ERP - Implementation Guide

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- ✅ **Node.js 20+** installed ([Download](https://nodejs.org/))
- ✅ **pnpm 9+** installed: `npm install -g pnpm`
- ✅ **Docker Desktop** installed ([Download](https://www.docker.com/products/docker-desktop))
- ✅ **Git** installed
- ✅ **Visual Studio Code** (recommended)

## 🏗️ Step-by-Step Setup

### Step 1: Install Dependencies

```powershell
# Navigate to project root
cd "C:\Users\musta\OneDrive\Documents\GitHub\Manufacturing ERP"

# Install all dependencies (this will take 5-10 minutes)
pnpm install
```

### Step 2: Setup Environment Variables

```powershell
# Copy example environment file
cp .env.example .env

# Edit .env file with your configuration
# Use notepad, VS Code, or any text editor
notepad .env
```

**Important**: Change these values in production:
- All passwords
- JWT secrets
- Database credentials

### Step 3: Start Infrastructure Services

```powershell
# Start PostgreSQL, Redis, RabbitMQ, Elasticsearch, MinIO
pnpm docker:dev

# Wait for all services to be healthy (30-60 seconds)
# You can check status with:
docker ps
```

### Step 4: Setup Database

```powershell
# Generate Prisma Client
cd packages/database
pnpm generate

# Run database migrations
pnpm migrate

# Seed initial data (admin user, sample data)
pnpm seed

# Return to root
cd ../..
```

### Step 5: Start Development Servers

```powershell
# Start all applications (API + Web)
pnpm dev
```

This will start:
- **API Server**: http://localhost:4000
- **Web Application**: http://localhost:3000
- **GraphQL Playground**: http://localhost:4000/graphql
- **API Documentation**: http://localhost:4000/api/docs

### Step 6: Access the Application

Open your browser and navigate to:
- **Web App**: http://localhost:3000
- **API Docs**: http://localhost:4000/api/docs

**Default Login Credentials**:
```
Email: admin@saifautomations.com
Password: Admin@123
```

## 🔍 Verify Installation

### Check Docker Services

```powershell
# Check all containers are running
docker ps

# You should see:
# - saif-erp-postgres
# - saif-erp-redis
# - saif-erp-rabbitmq
# - saif-erp-elasticsearch
# - saif-erp-minio
# - saif-erp-mailhog
```

### Test Database Connection

```powershell
# Open Prisma Studio to browse database
cd packages/database
pnpm studio
```

### Access Infrastructure UIs

- **RabbitMQ Management**: http://localhost:15672
  - Username: `saif_admin`
  - Password: `saif_rabbit_pass`

- **MinIO Console**: http://localhost:9001
  - Username: `saif_admin`
  - Password: `saif_minio_pass_2025`

- **Mailhog (Email Testing)**: http://localhost:8025

## 📦 Project Structure Explained

```
Manufacturing ERP/
├── apps/
│   ├── web/              # Next.js frontend (Port 3000)
│   │   ├── src/
│   │   │   ├── app/      # Next.js 14 App Router
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── store/
│   │   └── package.json
│   │
│   └── api/              # NestJS backend (Port 4000)
│       ├── src/
│       │   ├── auth/     # Authentication module
│       │   ├── tenant/   # Multi-tenant management
│       │   ├── purchase/ # Purchase module
│       │   ├── inventory/# Inventory module
│       │   ├── production/# Production module
│       │   ├── sales/    # Sales module
│       │   ├── service/  # After-sales service
│       │   ├── uid/      # UID tracking system
│       │   └── workflow/ # Workflow engine
│       └── package.json
│
├── packages/
│   ├── database/         # Prisma schema & migrations
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       └── seed.ts
│   │
│   ├── ui/              # Shared UI components
│   ├── types/           # Shared TypeScript types
│   ├── utils/           # Shared utilities
│   └── config/          # Shared configurations
│
├── docker-compose.yml   # Infrastructure services
├── turbo.json          # Monorepo build configuration
├── pnpm-workspace.yaml # PNPM workspace config
└── package.json        # Root dependencies
```

## 🔧 Development Workflow

### Running Individual Services

```powershell
# Run only the API
cd apps/api
pnpm dev

# Run only the Web app
cd apps/web
pnpm dev

# Run database studio
cd packages/database
pnpm studio
```

### Database Operations

```powershell
cd packages/database

# Create a new migration
pnpm migrate -- --name add_new_feature

# Reset database (WARNING: deletes all data)
pnpm db:reset

# Push schema changes without migration
pnpm db:push

# Seed database
pnpm seed
```

### Building for Production

```powershell
# Build all packages
pnpm build

# Build specific package
pnpm --filter @saif-erp/web build
pnpm --filter @saif-erp/api build
```

### Code Quality

```powershell
# Lint all code
pnpm lint

# Format all code
pnpm format

# Run tests
pnpm test
```

## 🐛 Troubleshooting

### Issue: Docker containers won't start

```powershell
# Stop all containers
pnpm docker:down

# Remove all volumes (WARNING: deletes data)
docker-compose down -v

# Start fresh
pnpm docker:dev
```

### Issue: Port already in use

```powershell
# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :4000
netstat -ano | findstr :5432

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Issue: Database connection errors

1. Check PostgreSQL is running:
   ```powershell
   docker ps | findstr postgres
   ```

2. Test connection:
   ```powershell
   docker exec -it saif-erp-postgres psql -U saif_admin -d saif_erp
   ```

3. Verify DATABASE_URL in .env file

### Issue: Module not found errors

```powershell
# Clean and reinstall
pnpm clean
rm -rf node_modules
pnpm install
```

### Issue: Prisma Client errors

```powershell
cd packages/database
pnpm generate
cd ../..
```

## 🔐 Security Notes

### Development Environment
- Default passwords are insecure - **DO NOT use in production**
- CORS is open to localhost - restrict in production
- Debug logging is enabled - disable in production

### Production Deployment
Before deploying to production:

1. **Change all default passwords** in .env
2. **Generate new JWT secrets**:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
3. **Enable HTTPS/TLS**
4. **Set up firewall rules**
5. **Configure backup schedules**
6. **Set up monitoring and alerts**
7. **Review and restrict CORS origins**

## 📚 Next Steps

After successful setup:

1. **Explore the Architecture**: Read [ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Review Database Schema**: Check `packages/database/prisma/schema.prisma`
3. **Test API Endpoints**: Use http://localhost:4000/api/docs
4. **Create First Tenant**: Use the admin panel
5. **Setup User Roles**: Configure role-based access
6. **Configure Workflows**: Define approval hierarchies

## 🎓 Learning Resources

- **NestJS Documentation**: https://docs.nestjs.com/
- **Next.js Documentation**: https://nextjs.org/docs
- **Prisma Documentation**: https://www.prisma.io/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Query**: https://tanstack.com/query/latest

## 🆘 Getting Help

### Documentation
- Full API documentation: http://localhost:4000/api/docs
- GraphQL Schema: http://localhost:4000/graphql

### Support Channels
- Email: support@saifautomations.com
- Issue Tracker: GitHub Issues

### Common Commands Reference

```powershell
# Start everything
pnpm dev

# Stop Docker services
pnpm docker:down

# Clean build artifacts
pnpm clean

# Run database migrations
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio

# Build for production
pnpm build

# Run production build
pnpm start

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm format
```

## ✅ Success Criteria

You have successfully set up the system when:

- ✅ All Docker containers are running
- ✅ Database migrations completed without errors
- ✅ API server responds at http://localhost:4000
- ✅ Web application loads at http://localhost:3000
- ✅ You can login with default credentials
- ✅ API documentation is accessible
- ✅ No errors in terminal/console

## 🎉 Congratulations!

Your Saif Automations Manufacturing ERP system is now running!

**What's Next?**
1. Customize for your organization
2. Configure multi-tenant settings
3. Set up your plants and departments
4. Create user accounts and roles
5. Import master data
6. Configure workflows
7. Start using the system!

---

**Happy Manufacturing! 🏭**
