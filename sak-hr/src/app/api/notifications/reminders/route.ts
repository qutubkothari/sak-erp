import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const now = new Date();

  const overdueEvaluations = await prisma.evaluation.findMany({
    where: {
      status: 'SELF_REVIEW',
      cycle: {
        selfAssessmentDeadline: {
          lt: now,
        },
      },
    },
    include: {
      cycle: { select: { id: true, name: true, selfAssessmentDeadline: true } },
      employee: { select: { id: true, firstName: true, lastName: true, managerId: true } },
    },
  });

  if (!overdueEvaluations.length) {
    return NextResponse.json({ overdue: 0, sent: 0 });
  }

  const employeeIds = overdueEvaluations.map((evaluation) => evaluation.employeeId);
  const managerIds = overdueEvaluations
    .map((evaluation) => evaluation.employee?.managerId)
    .filter((id): id is string => Boolean(id));

  const users = await prisma.user.findMany({
    where: { employeeId: { in: [...employeeIds, ...managerIds] } },
    select: { id: true, employeeId: true },
  });

  const userByEmployeeId = new Map(users.map((user) => [user.employeeId, user.id]));

  const notifications = overdueEvaluations.flatMap((evaluation) => {
    const employeeUserId = userByEmployeeId.get(evaluation.employeeId);
    const managerUserId = evaluation.employee?.managerId
      ? userByEmployeeId.get(evaluation.employee.managerId)
      : undefined;

    const entries: Array<{
      userId: string;
      type: string;
      title: string;
      message: string;
      actionUrl?: string;
      metadata?: Record<string, unknown>;
    }> = [];

    if (employeeUserId) {
      entries.push({
        userId: employeeUserId,
        type: 'review_reminder',
        title: 'Self-assessment overdue',
        message: `Your self-assessment for ${evaluation.cycle?.name ?? 'the review cycle'} is overdue.`,
        actionUrl: `/performance/self-assessment?evaluationId=${evaluation.id}`,
        metadata: { evaluationId: evaluation.id, cycleId: evaluation.cycleId },
      });
    }

    if (managerUserId) {
      entries.push({
        userId: managerUserId,
        type: 'review_reminder',
        title: 'Self-assessment overdue',
        message: `${evaluation.employee?.firstName} ${evaluation.employee?.lastName} has an overdue self-assessment.`,
        actionUrl: '/performance/manager-dashboard',
        metadata: { evaluationId: evaluation.id, employeeId: evaluation.employeeId, cycleId: evaluation.cycleId },
      });
    }

    return entries;
  });

  if (!notifications.length) {
    return NextResponse.json({ overdue: overdueEvaluations.length, sent: 0 });
  }

  await prisma.notification.createMany({ data: notifications });

  return NextResponse.json({ overdue: overdueEvaluations.length, sent: notifications.length });
}
