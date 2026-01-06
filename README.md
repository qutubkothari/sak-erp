# 🏭 Saif Automations - Manufacturing ERP System

> **Enterprise-grade, cloud-native Manufacturing ERP with multi-tenant, multi-language, and multi-plant architecture**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue)](https://www.typescriptlang.org/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## 🎯 Overview

Saif Automations ERP is a comprehensive manufacturing management system designed to handle the complete lifecycle from procurement to after-sales service. Built with scalability, performance, and multi-tenancy at its core.

### Key Capabilities:
- ✅ **Complete Traceability**: UID-based tracking from raw material to customer
- ✅ **Multi-Tenant Architecture**: Single codebase, multiple organizations
- ✅ **Multi-Language Support**: English, Hindi, Bengali, Telugu
- ✅ **Multi-Plant Operations**: Manage multiple manufacturing facilities
- ✅ **Configurable Workflows**: Flexible approval hierarchies
- ✅ **Real-time Dashboards**: Live insights across all operations
- ✅ **Tally ERP Integration**: Bi-directional financial sync
- ✅ **Warranty Management**: Complete after-sales service tracking

---

## 🚀 Features

### 🛒 Purchase Management
- Multi-level approval workflows
- Auto-generation of POs from BOM
- Vendor performance tracking
- Automatic UID assignment at GRN
- Tally synchronization

### 📦 Stores & Inventory
- Real-time inventory tracking
- UID-based material management
- Demo inventory handling
- Stock alerts and notifications
- Multi-location warehousing

### 🏭 Production Management
- BOM-driven production orders
- Stage-wise assembly tracking
- Engineering drawing management
- Quality checkpoints
- WIP monitoring

### 🔬 R&D Module
- Project-based cost tracking
- Prototype management
- Design revision control
- Material consumption analysis

### ✅ Quality & Inspection
- Incoming/in-process/final inspections
- NCR logging and tracking
- Vendor quality analytics
- Certificate generation

### 💼 Sales & Dispatch
- Quotation management
- Warranty documentation
- Delivery challan generation
- Demo tracking and conversion
- Customer portal

### 🛠️ After-Sales Service
- Complaint logging and tracking
- Automatic warranty validation
- Service ticket management
- Spare parts requisition
- SLA monitoring

### 👥 Human Resources
- Attendance management
- Automated payroll
- Leave management
- Performance tracking

### 📄 Document Control
- Centralized document repository
- Version control
- Role-based access
- Audit trails

---

## 🚚 Deployment

### Auto-Deploy (GitHub → Hostinger)
Every push to `main` automatically deploys to Hostinger using the same PowerShell script you use locally.

**How it works:**
1. GitHub Actions triggers on push to `main`
2. Runs `deploy-hostinger.ps1` (builds locally, uploads artifact, restarts PM2)
3. Same process as running `.\deploy-github-and-hostinger.ps1` locally

**Required GitHub Secrets:**
- `VPS_HOST` = `72.62.192.228` (your Hostinger IP)
- `VPS_USER` = `qutubk` (SSH username)
- `VPS_SSH_KEY` = your ed25519/RSA private key content
- `VPS_PATH` = `/var/www/sak-erp` (remote path)

**Workflow file:** `.github/workflows/deploy-vps.yml`

### Manual Deploy (Local)
Run `.\deploy-github-and-hostinger.ps1` to:
1. Commit & push to GitHub
2. Build locally
3. Deploy to Hostinger

### VPS Requirements
- Node.js 20+, pnpm, PM2 installed
- Deploy directory exists: `/var/www/sak-erp`

---

## 🏗️ Architecture

This is a **microservices-based monorepo** using:
- **Frontend**: Next.js 14+ (React)
- **Backend**: NestJS (Node.js)
- **Database**: PostgreSQL 16+
- **Cache**: Redis
- **Message Queue**: RabbitMQ
- **Search**: Elasticsearch
- **Storage**: MinIO (S3-compatible)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library
- **Zustand** - State management
- **React Query** - Server state
- **next-intl** - Internationalization

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe backend
- **Prisma** - Type-safe ORM
- **GraphQL** - Flexible API queries
- **WebSockets** - Real-time updates
- **Bull** - Job queue

### Database & Storage
- **PostgreSQL** - Primary database
- **Redis** - Caching & sessions
- **Elasticsearch** - Full-text search
- **MinIO** - Object storage

### DevOps
- **Docker** - Containerization
- **Kubernetes** - Orchestration
- **GitHub Actions** - CI/CD
- **Prometheus** - Monitoring
- **Grafana** - Visualization

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Docker** & **Docker Compose**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/saif-automations/manufacturing-erp.git
   cd manufacturing-erp
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start infrastructure services**
   ```bash
   pnpm docker:dev
   ```

5. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

6. **Seed initial data**
   ```bash
   pnpm db:seed
   ```

7. **Start development servers**
   ```bash
   pnpm dev
   ```

8. **Access the application**
   - **Web App**: http://localhost:3000
   - **API**: http://localhost:4000
   - **GraphQL Playground**: http://localhost:4000/graphql
   - **RabbitMQ Management**: http://localhost:15672
   - **MinIO Console**: http://localhost:9001
   - **Mailhog**: http://localhost:8025

### Default Credentials (Development)
```
Email: admin@saifautomations.com
Password: Admin@123
```

---

## 📁 Project Structure

```
saif-erp/
├── apps/
│   ├── web/                    # Next.js frontend application
│   ├── api/                    # NestJS backend API
│   └── admin/                  # Admin dashboard (optional)
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── database/               # Prisma schema & migrations
│   ├── types/                  # Shared TypeScript types
│   ├── utils/                  # Shared utilities
│   ├── i18n/                   # Internationalization resources
│   └── config/                 # Shared configuration
├── services/
│   ├── auth/                   # Authentication service
│   ├── tenant/                 # Tenant management service
│   ├── purchase/               # Purchase module service
│   ├── inventory/              # Inventory management service
│   ├── production/             # Production management service
│   ├── sales/                  # Sales & dispatch service
│   ├── service/                # After-sales service
│   ├── hr/                     # HR management service
│   ├── workflow/               # Workflow engine
│   ├── notification/           # Notification service
│   └── integration/            # External integrations (Tally)
├── docker-compose.yml          # Development infrastructure
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # PNPM workspace config
├── package.json                # Root package.json
├── ARCHITECTURE.md             # Architecture documentation
└── README.md                   # This file
```

---

## 💻 Development

### Available Scripts

```bash
# Development
pnpm dev                    # Start all services in dev mode
pnpm build                  # Build all packages
pnpm test                   # Run all tests
pnpm lint                   # Lint all packages
pnpm format                 # Format code with Prettier

# Database
pnpm db:migrate             # Run database migrations
pnpm db:seed                # Seed database
pnpm db:studio              # Open Prisma Studio

# Docker
pnpm docker:dev             # Start development containers
pnpm docker:down            # Stop all containers

# Cleaning
pnpm clean                  # Remove all build artifacts
```

### Code Quality

- **ESLint** - Linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Commitlint** - Commit message linting
- **Jest** - Unit & integration testing
- **Playwright** - E2E testing

### Development Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -m "feat: add new feature"`
3. Push branch: `git push origin feature/my-feature`
4. Create Pull Request
5. Wait for CI checks
6. Request review
7. Merge after approval

---

## 🚢 Deployment

### Docker Production Build

```bash
# Build production images
docker build -t saif-erp-web:latest -f apps/web/Dockerfile .
docker build -t saif-erp-api:latest -f apps/api/Dockerfile .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

```bash
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress.yaml
```

### Environment Variables

See `.env.example` for all required environment variables.

**Critical Production Settings:**
- Change all default passwords
- Set strong JWT secrets
- Configure proper CORS origins
- Enable HTTPS/TLS
- Setup backup schedules
- Configure monitoring alerts

---

## 📚 Documentation

- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [API Documentation](./docs/API.md) - REST & GraphQL API reference
- [Database Schema](./docs/DATABASE.md) - Database structure
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment
- [User Manual](./docs/USER_MANUAL.md) - End-user documentation
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines

---

## 🔐 Security

- Report security vulnerabilities to: security@saifautomations.com
- See [SECURITY.md](./SECURITY.md) for security policies

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file.

---

## 👥 Team

- **Project Manager**: [Name]
- **Lead Architect**: [Name]
- **Backend Lead**: [Name]
- **Frontend Lead**: [Name]
- **DevOps Lead**: [Name]

---

## 📞 Support

- **Email**: support@saifautomations.com
- **Phone**: +91-XXXXXXXXXX
- **Documentation**: https://docs.saifautomations.com
- **Issue Tracker**: https://github.com/saif-automations/manufacturing-erp/issues

---

## 🎯 Roadmap

### Phase 1 (Q1 2025) ✅
- ✅ Architecture design
- ✅ Project setup
- ⏳ Core infrastructure

### Phase 2 (Q2 2025)
- [ ] Purchase & Inventory modules
- [ ] UID tracking system
- [ ] Basic workflows

### Phase 3 (Q3 2025)
- [ ] Production & Quality modules
- [ ] Sales & Service modules
- [ ] Advanced workflows

### Phase 4 (Q4 2025)
- [ ] HR & Admin modules
- [ ] Tally integration
- [ ] Performance optimization
- [ ] Production deployment

---

**Built with ❤️ for Saif Automations**
