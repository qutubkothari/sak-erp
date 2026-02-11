const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUsers() {
  try {
    // First, let's see what's in the database
    const users = await prisma.$queryRaw`SELECT id, email, role FROM "User"`;
    
    console.log('\n=== Current Users ===');
    users.forEach(user => {
      console.log(`Email: ${user.email} | Role: ${user.role}`);
    });

    // Update all roles to lowercase
    console.log('\n=== Updating roles to lowercase ===');
    await prisma.$executeRaw`UPDATE "User" SET role = LOWER(role::text)::"Role"`;
    
    console.log('✓ Roles updated successfully');

    // Verify the changes
    const updatedUsers = await prisma.$queryRaw`SELECT id, email, role FROM "User"`;
    console.log('\n=== Updated Users ===');
    updatedUsers.forEach(user => {
      console.log(`Email: ${user.email} | Role: ${user.role}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixUsers();
