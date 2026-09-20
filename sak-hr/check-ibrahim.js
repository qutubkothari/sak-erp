const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking user ibrahim@sakhr.com...\n');
  
  const user = await prisma.user.findUnique({
    where: { email: 'ibrahim@sakhr.com' },
    include: { employee: true }
  });
  
  console.log('User record:');
  console.log(JSON.stringify(user, null, 2));
  
  if (user?.employeeId) {
    console.log('\n\nEvaluations for this employee:');
    const evaluations = await prisma.evaluation.findMany({
      where: { employeeId: user.employeeId },
      include: {
        employee: true,
        cycle: true,
        approvals: true
      }
    });
    console.log(JSON.stringify(evaluations, null, 2));
  } else {
    console.log('\n\nNo employeeId linked to this user!');
    
    const employee = await prisma.employee.findUnique({
      where: { email: 'ibrahim@sakhr.com' }
    });
    
    if (employee) {
      console.log('\n\nEmployee record found:');
      console.log(JSON.stringify(employee, null, 2));
      console.log('\n\nNeed to link User.employeeId to:', employee.id);
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
