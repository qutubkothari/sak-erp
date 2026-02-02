const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAdminRole() {
  console.log('Updating admin@sakhr.com role to "admin"...');
  
  const updated = await prisma.user.update({
    where: { email: 'admin@sakhr.com' },
    data: { role: 'admin' }
  });
  
  console.log('✅ Updated:', updated);
  
  // Verify all users
  const allUsers = await prisma.user.findMany({
    select: { email: true, role: true }
  });
  
  console.log('\nAll users:');
  allUsers.forEach(u => {
    console.log(`  ${u.email}: ${u.role}`);
  });
  
  await prisma.$disconnect();
}

fixAdminRole();
