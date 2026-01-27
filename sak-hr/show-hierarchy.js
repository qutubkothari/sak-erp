const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all employees with their manager info
  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    include: {
      manager: true,
    },
    orderBy: { firstName: 'asc' }
  });
  
  console.log('\n=== ORGANIZATION HIERARCHY ===\n');
  
  for (const emp of employees) {
    // Count direct reports
    const directReports = await prisma.employee.count({
      where: { managerId: emp.id }
    });
    
    const reportsTo = emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : 'No manager (Top level)';
    const role = directReports > 0 ? '👔 MANAGER' : '👤 Employee';
    
    console.log(`${role} ${emp.firstName} ${emp.lastName} (${emp.email})`);
    console.log(`   Reports to: ${reportsTo}`);
    console.log(`   Manages: ${directReports} people`);
    console.log('');
  }
  
  // Now update User roles based on whether they manage people
  console.log('\n=== UPDATING USER ROLES ===\n');
  
  for (const emp of employees) {
    const directReports = await prisma.employee.count({
      where: { managerId: emp.id }
    });
    
    const user = await prisma.user.findUnique({
      where: { email: emp.email }
    });
    
    if (user) {
      const shouldBeManager = directReports > 0;
      const currentRole = user.role;
      const newRole = shouldBeManager ? 'manager' : 'employee';
      
      if (currentRole !== newRole && currentRole !== 'hr') { // Don't change HR users
        await prisma.user.update({
          where: { email: emp.email },
          data: { role: newRole }
        });
        console.log(`✅ ${emp.firstName} ${emp.lastName}: ${currentRole} → ${newRole}`);
      } else {
        console.log(`✓ ${emp.firstName} ${emp.lastName}: ${currentRole} (no change)`);
      }
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
