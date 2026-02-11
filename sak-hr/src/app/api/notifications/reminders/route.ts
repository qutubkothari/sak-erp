import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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

  // Note: Notification system disabled due to User-Employee unlinking
  // TODO: Implement notification system based on email or alternative approach

  return NextResponse.json({ overdue: overdueEvaluations.length, sent: 0 });
}
