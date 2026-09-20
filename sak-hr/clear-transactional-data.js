const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearTransactionalData() {
  console.log('🗑️  Clearing all transactional data...\n');

  try {
    // Delete in order of dependencies
    console.log('Deleting FeedbackResponses...');
    const feedbackResponses = await prisma.feedbackResponse.deleteMany();
    console.log(`✅ Deleted ${feedbackResponses.count} FeedbackResponses`);

    console.log('Deleting FeedbackRequests...');
    const feedbackRequests = await prisma.feedbackRequest.deleteMany();
    console.log(`✅ Deleted ${feedbackRequests.count} FeedbackRequests`);

    console.log('Deleting CalibrationEntries...');
    const calibrationEntries = await prisma.calibrationEntry.deleteMany();
    console.log(`✅ Deleted ${calibrationEntries.count} CalibrationEntries`);

    console.log('Deleting CalibrationSessions...');
    const calibrationSessions = await prisma.calibrationSession.deleteMany();
    console.log(`✅ Deleted ${calibrationSessions.count} CalibrationSessions`);

    console.log('Deleting ImprovementPlans...');
    const improvementPlans = await prisma.improvementPlan.deleteMany();
    console.log(`✅ Deleted ${improvementPlans.count} ImprovementPlans`);

    console.log('Deleting AppraisalLetters...');
    const appraisalLetters = await prisma.appraisalLetter.deleteMany();
    console.log(`✅ Deleted ${appraisalLetters.count} AppraisalLetters`);

    console.log('Deleting ManagerReviews...');
    const managerReviews = await prisma.managerReview.deleteMany();
    console.log(`✅ Deleted ${managerReviews.count} ManagerReviews`);

    console.log('Deleting SelfAssessments...');
    const selfAssessments = await prisma.selfAssessment.deleteMany();
    console.log(`✅ Deleted ${selfAssessments.count} SelfAssessments`);

    console.log('Deleting EvaluationEvidence...');
    const evidence = await prisma.evaluationEvidence.deleteMany();
    console.log(`✅ Deleted ${evidence.count} EvaluationEvidence`);

    console.log('Deleting EvaluationActivities...');
    const activities = await prisma.evaluationActivity.deleteMany();
    console.log(`✅ Deleted ${activities.count} EvaluationActivities`);

    console.log('Deleting EvaluationApprovals...');
    const approvals = await prisma.evaluationApproval.deleteMany();
    console.log(`✅ Deleted ${approvals.count} EvaluationApprovals`);

    console.log('Deleting EvaluationItems...');
    const items = await prisma.evaluationItem.deleteMany();
    console.log(`✅ Deleted ${items.count} EvaluationItems`);

    console.log('Deleting Goals...');
    const goals = await prisma.goal.deleteMany();
    console.log(`✅ Deleted ${goals.count} Goals`);

    console.log('Deleting Evaluations...');
    const evaluations = await prisma.evaluation.deleteMany();
    console.log(`✅ Deleted ${evaluations.count} Evaluations`);

    console.log('Deleting Notifications...');
    const notifications = await prisma.notification.deleteMany();
    console.log(`✅ Deleted ${notifications.count} Notifications`);

    console.log('\n✨ Transactional data cleared successfully!\n');

    // Show remaining counts
    console.log('📊 Remaining Master Data:');
    const [users, employees, departments, roles, cycles, competencies, kpis, meritDemerits] = await Promise.all([
      prisma.user.count(),
      prisma.employee.count(),
      prisma.department.count(),
      prisma.role.count(),
      prisma.reviewCycle.count(),
      prisma.competency.count(),
      prisma.kPI.count(),
      prisma.meritDemerit.count(),
    ]);

    console.log(`Users: ${users}`);
    console.log(`Employees: ${employees}`);
    console.log(`Departments: ${departments}`);
    console.log(`Roles: ${roles}`);
    console.log(`ReviewCycles: ${cycles}`);
    console.log(`Competencies: ${competencies}`);
    console.log(`KPIs: ${kpis}`);
    console.log(`MeritDemerits: ${meritDemerits}`);

  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearTransactionalData();
