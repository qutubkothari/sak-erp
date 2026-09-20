const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get Ibrahim's user account
  const user = await prisma.user.findUnique({
    where: { email: 'ibrahim@sakhr.com' }
  });
  
  console.log('=== IBRAHIM USER ACCOUNT ===');
  console.log('Email:', user.email);
  console.log('Role:', user.role);
  console.log('Employee ID:', user.employeeId);
  
  // Get appraisal letters for Ibrahim
  const letters = await prisma.appraisalLetter.findMany({
    where: {
      evaluation: {
        employeeId: user.employeeId
      }
    },
    include: {
      evaluation: {
        include: {
          employee: true,
          cycle: true
        }
      },
      approvedBy: true
    }
  });
  
  console.log('\n=== APPRAISAL LETTERS FOR IBRAHIM ===');
  console.log('Total letters:', letters.length);
  
  letters.forEach((letter, index) => {
    console.log(`\n--- Letter ${index + 1} ---`);
    console.log('Subject:', letter.subject);
    console.log('Employee:', letter.evaluation.employee.firstName, letter.evaluation.employee.lastName);
    console.log('Cycle:', letter.evaluation.cycle.name);
    console.log('Approval Status:', letter.approvalStatus);
    console.log('Issued On:', new Date(letter.issuedOn).toLocaleDateString('en-GB'));
    console.log('Approved By:', letter.approvedBy ? `${letter.approvedBy.firstName} ${letter.approvedBy.lastName}` : 'Not yet');
    console.log('\nSummary Preview:');
    console.log(letter.summary.substring(0, 200) + '...');
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
