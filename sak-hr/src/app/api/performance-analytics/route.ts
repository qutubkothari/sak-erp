import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ratingBuckets = [
  { label: 'Below 2.0', min: Number.NEGATIVE_INFINITY, max: 1.99 },
  { label: '2.0 - 2.9', min: 2, max: 2.99 },
  { label: '3.0 - 3.9', min: 3, max: 3.99 },
  { label: '4.0+', min: 4, max: Number.POSITIVE_INFINITY },
];

export async function GET() {
  const [
    employeeCount,
    activeEmployeeCount,
    evaluationCount,
    evaluationsByStatus,
    scoreAverages,
    feedbackRequestCount,
    feedbackResponseCount,
    calibrationSessionCount,
    appraisalLetterCount,
    cycleCount,
    departments,
    ratings,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
    prisma.evaluation.count(),
    prisma.evaluation.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.evaluation.aggregate({
      _avg: { overallScore: true, managerScore: true, finalRating: true },
    }),
    prisma.feedbackRequest.count(),
    prisma.feedbackResponse.count(),
    prisma.calibrationSession.count(),
    prisma.appraisalLetter.count(),
    prisma.reviewCycle.count(),
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { employees: true } } },
    }),
    prisma.evaluation.findMany({
      where: { finalRating: { not: null } },
      select: { finalRating: true },
    }),
  ]);

  const ratingDistribution = ratingBuckets.map((bucket) => ({
    label: bucket.label,
    count: ratings.filter((rating) => {
      const value = rating.finalRating ?? 0;
      return value >= bucket.min && value <= bucket.max;
    }).length,
  }));

  return NextResponse.json({
    totals: {
      employees: employeeCount,
      activeEmployees: activeEmployeeCount,
      evaluations: evaluationCount,
      cycles: cycleCount,
      calibrationSessions: calibrationSessionCount,
      feedbackRequests: feedbackRequestCount,
      feedbackResponses: feedbackResponseCount,
      appraisalLetters: appraisalLetterCount,
    },
    evaluationsByStatus: evaluationsByStatus.map((row) => ({
      status: row.status,
      count: row._count.status,
    })),
    averages: {
      overallScore: scoreAverages._avg.overallScore,
      managerScore: scoreAverages._avg.managerScore,
      finalRating: scoreAverages._avg.finalRating,
    },
    departments: departments.map((department) => ({
      id: department.id,
      name: department.name,
      employeeCount: department._count.employees,
    })),
    ratingDistribution,
  });
}
