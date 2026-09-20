const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check Ibrahim's hierarchy
  const ibrahim = await prisma.employee.findUnique({
    where: { email: 'ibrahim@sakhr.com' },
    include: {
      manager: true, // His boss
    }
  });
  
  // Check who reports to Ibrahim
  const directReports = await prisma.employee.findMany({
    where: { managerId: ibrahim.id },
    select: { id: true, firstName: true, lastName: true, email: true }
  });
  
  console.log('Ibrahim Arabi:');
  console.log('- Employee ID:', ibrahim.id);
  console.log('- Reports to:', ibrahim.manager ? `${ibrahim.manager.firstName} ${ibrahim.manager.lastName}` : 'No manager');
  console.log('- Manages', directReports.length, 'people:');
  directReports.forEach(emp => {
    console.log(`  - ${emp.firstName} ${emp.lastName} (${emp.email})`);
  });
  
  // Update Ibrahim's role to "manager" if he has direct reports
  if (directReports.length > 0) {
    const updated = await prisma.user.update({
      where: { email: 'ibrahim@sakhr.com' },
      data: { role: 'manager' }
    });
    console.log('\n✅ Updated Ibrahim\'s role to "manager"');
  } else {
    console.log('\n⚠️ Ibrahim has no direct reports, keeping role as "employee"');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
