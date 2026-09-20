const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Updating Ibrahim user role to "hr"...\n');
  
  const updated = await prisma.user.update({
    where: { email: 'ibrahim@sakhr.com' },
    data: { role: 'hr' }
  });
  
  console.log('Updated user:');
  console.log(JSON.stringify(updated, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);
