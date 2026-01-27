const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Reverting Ibrahim role back to "employee"...\n');
  
  const updated = await prisma.user.update({
    where: { email: 'ibrahim@sakhr.com' },
    data: { role: 'employee' }
  });
  
  console.log('Updated user:');
  console.log(JSON.stringify(updated, null, 2));
  
  // Check if appraisal letter exists for Ibrahim's evaluation
  const letters = await prisma.appraisalLetter.findMany({
    where: {
      evaluation: {
        employeeId: updated.employeeId
      }
    },
    include: {
      evaluation: {
        include: {
          employee: true,
          cycle: true
        }
      }
    }
  });
  
  console.log('\n\nAppraisal letters for Ibrahim:');
  console.log(JSON.stringify(letters, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);
