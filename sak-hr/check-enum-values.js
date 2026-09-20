const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndFixRoles() {
  try {
    // Check current enum values
    const enumValues = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
      ORDER BY enumlabel
    `;
    
    console.log('\n=== Current Role Enum Values ===');
    enumValues.forEach(e => console.log(e.enumlabel));

    // Check current  users
    const users = await prisma.$queryRaw`SELECT id, email, role FROM "User"`;
    
    console.log('\n=== Current Users ===');
    users.forEach(user => {
      console.log(`Email: ${user.email} | Role: ${user.role}`);
    });

    // Since enum values are uppercase, the code needs to accept them
    // OR we need to update the login validation
    console.log('\n💡 Solution: The database has uppercase roles (ADMIN, MANAGER, EMPLOYEE)');
    console.log('   The auth code expects lowercase. Need to update auth.ts to handle uppercase.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixRoles();
