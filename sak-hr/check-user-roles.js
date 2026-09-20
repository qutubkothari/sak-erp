const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      employeeId: true
    }
  });
  
  console.log('Current Users and Roles:');
  console.log(JSON.stringify(users, null, 2));
  
  await prisma.$disconnect();
}

checkUsers();
