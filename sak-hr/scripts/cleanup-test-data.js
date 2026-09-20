const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const qaEmployees = await prisma.employee.findMany({
    where: {
      OR: [
        { email: { startsWith: 'qa-' } },
        { code: { startsWith: 'QA' } },
        { firstName: 'QA', lastName: 'Employee' },
      ],
    },
    select: { id: true, email: true, code: true },
  });

  const employeeIds = qaEmployees.map((e) => e.id);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { startsWith: 'qa-' } },
        { employeeId: { in: employeeIds } },
      ],
    },
    select: { id: true },
  });

  const userIds = users.map((u) => u.id);

  const evaluations = await prisma.evaluation.findMany({
    where: { employeeId: { in: employeeIds } },
    select: { id: true },
  });

  const evaluationIds = evaluations.map((e) => e.id);

  if (evaluationIds.length) {
    await prisma.$transaction([
      prisma.feedbackResponse.deleteMany({ where: { evaluationId: { in: evaluationIds } } }),
      prisma.feedbackRequest.deleteMany({ where: { evaluationId: { in: evaluationIds } } }),
      prisma.calibrationEntry.deleteMany({ where: { evaluationId: { in: evaluationIds } } }),
      prisma.appraisalLetter.deleteMany({ where: { evaluationId: { in: evaluationIds } } }),
      prisma.improvementPlan.deleteMany({ where: { evaluationId: { in: evaluationIds } } }),
      prisma.evaluationEvidence.deleteMany({ where: { evaluationId: { in: evaluationIds } } }),
      prisma.evaluationItem.deleteMany({ where: { evaluationId: { in: evaluationIds } } }),
      prisma.evaluationApproval.deleteMany({ where: { evaluationId: { in: evaluationIds } } }),
      prisma.evaluationActivity.deleteMany({ where: { evaluationId: { in: evaluationIds } } }),
      prisma.managerReview.deleteMany({ where: { evaluationId: { in: evaluationIds } } }),
      prisma.selfAssessment.deleteMany({ where: { evaluationId: { in: evaluationIds } } }),
      prisma.evaluation.deleteMany({ where: { id: { in: evaluationIds } } }),
    ]);
  }

  if (userIds.length) {
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  if (employeeIds.length) {
    await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
  }

  console.log(
    JSON.stringify({
      qaEmployees: qaEmployees.length,
      evaluations: evaluationIds.length,
      users: userIds.length,
    })
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
