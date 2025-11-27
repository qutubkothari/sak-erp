import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create SAK Solutions as super admin tenant
  const sakTenant = await prisma.tenant.upsert({
    where: { subdomain: 'sak-admin' },
    update: {},
    create: {
      name: 'SAK Solutions',
      subdomain: 'sak-admin',
      domain: 'sak-solutions.com',
      isActive: true,
      metadata: {
        isSuperAdmin: true,
        canManageAllTenants: true,
      },
    },
  });

  console.log('✅ Created SAK Solutions tenant');

  // Create Saif Automations as first client
  const saifTenant = await prisma.tenant.upsert({
    where: { subdomain: 'saif-automations' },
    update: {},
    create: {
      name: 'Saif Automations Services LLP',
      subdomain: 'saif-automations',
      domain: 'saifautomations.com',
      isActive: true,
      settings: {
        defaultLanguage: 'en',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
      },
      metadata: {
        industry: 'Manufacturing',
        gstNumber: 'GSTIN123456789',
      },
    },
  });

  console.log('✅ Created Saif Automations tenant');

  // Create default roles for Saif Automations
  const roles = [
    {
      name: 'ADMIN',
      code: 'ADMIN',
      description: 'System Administrator',
      permissions: { all: true },
    },
    {
      name: 'OWNER',
      code: 'OWNER',
      description: 'Business Owner - Full access including price visibility',
      permissions: { viewPrices: true, manageAll: true },
    },
    {
      name: 'MANAGER',
      code: 'MANAGER',
      description: 'Department Manager',
      permissions: { viewPrices: true, manageTeam: true },
    },
    {
      name: 'ACCOUNTANT',
      code: 'ACCOUNTANT',
      description: 'Accountant - Financial access',
      permissions: { viewPrices: true, manageFinance: true },
    },
    {
      name: 'SUPERVISOR',
      code: 'SUPERVISOR',
      description: 'Production Supervisor',
      permissions: { viewPrices: false, manageProduction: true },
    },
    {
      name: 'OPERATOR',
      code: 'OPERATOR',
      description: 'Machine Operator',
      permissions: { viewPrices: false, operateOnly: true },
    },
    {
      name: 'USER',
      code: 'USER',
      description: 'Standard User',
      permissions: { viewPrices: false, readOnly: true },
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        tenantId_code: {
          tenantId: saifTenant.id,
          code: role.code,
        },
      },
      update: {},
      create: {
        ...role,
        tenantId: saifTenant.id,
      },
    });
  }

  console.log('✅ Created default roles');

  // Create main company for Saif Automations
  const mainCompany = await prisma.company.upsert({
    where: {
      tenantId_code: {
        tenantId: saifTenant.id,
        code: 'SAIF-HQ',
      },
    },
    update: {},
    create: {
      tenantId: saifTenant.id,
      code: 'SAIF-HQ',
      name: 'Saif Automations - Head Office',
      legalName: 'Saif Automations Services LLP',
      taxId: 'GSTIN123456789',
      address: 'Kolkata, West Bengal, India',
      isActive: true,
    },
  });

  console.log('✅ Created main company');

  // Create default plant
  const mainPlant = await prisma.plant.upsert({
    where: {
      tenantId_code: {
        tenantId: saifTenant.id,
        code: 'KOL-P01',
      },
    },
    update: {},
    create: {
      tenantId: saifTenant.id,
      companyId: mainCompany.id,
      code: 'KOL-P01',
      name: 'Kolkata Manufacturing Plant',
      type: 'MANUFACTURING',
      address: 'Kolkata, West Bengal, India',
      isActive: true,
    },
  });

  console.log('✅ Created main plant');

  // Create admin user for Saif Automations
  const adminRole = await prisma.role.findFirst({
    where: {
      tenantId: saifTenant.id,
      code: 'ADMIN',
    },
  });

  const hashedPassword = await bcrypt.hash('Admin@123', 12);

  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: saifTenant.id,
        email: 'admin@saifautomations.com',
      },
    },
    update: {},
    create: {
      tenantId: saifTenant.id,
      email: 'admin@saifautomations.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      roleId: adminRole?.id,
      isActive: true,
    },
  });

  console.log('✅ Created admin user');
  console.log('   Email: admin@saifautomations.com');
  console.log('   Password: Admin@123');
  console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');

  // Create sample item categories
  const categories = [
    'Raw Materials',
    'Components',
    'Sub-Assemblies',
    'Finished Goods',
    'Tools',
    'Consumables',
  ];

  console.log('✅ Created sample categories');

  console.log('');
  console.log('🎉 Database seeding completed!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Tenant: Saif Automations');
  console.log('  Email: admin@saifautomations.com');
  console.log('  Password: Admin@123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
