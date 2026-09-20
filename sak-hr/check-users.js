const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log('\n=== Users in Database ===');
    users.forEach(user => {
      console.log(`Email: ${user.email} | Role: ${user.role}`);
    });
    console.log(`\nTotal users: ${users.length}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
