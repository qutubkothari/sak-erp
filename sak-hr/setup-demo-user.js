const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupDemoUsers() {
  try {
    // Check if demo users exist
    const existingUser = await prisma.$queryRaw`SELECT email, role FROM "User" WHERE email LIKE '%sak%'`;
    
    console.log('\n=== Existing Users ===');
    existingUser.forEach(u => console.log(`${u.email} - ${u.role}`));

    // Create demo password hash for "demo123"
    const demoPassword = await bcrypt.hash('demo123', 10);
    
    // Update/create admin user
    console.log('\n=== Setting up demo user ===');
    await prisma.$executeRaw`
      UPDATE "User" 
      SET "passwordHash" = ${demoPassword}
      WHERE email = 'admin@sak.com'
    `;
    
    console.log('✓ Updated admin@sak.com with password: demo123');
    console.log('\n📝 Login Credentials:');
    console.log('   Email: admin@sak.com');
    console.log('   Password: demo123');

} catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupDemoUsers();
