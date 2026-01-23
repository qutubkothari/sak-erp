import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    stage: 'EMPLOYEE' | 'MANAGER' | 'HR';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approverId?: string;
    notes?: string;
  };

  if (!body.stage || !body.status) {
    return NextResponse.json({ message: 'stage and status are required' }, { status: 400 });
  }

  if (body.status === 'REJECTED' && !body.notes?.trim()) {
    return NextResponse.json({ message: 'Rejection notes are required' }, { status: 400 });
  }

  const approval = await prisma.evaluationApproval.updateMany({
    where: {
      evaluationId: id,
      stage: body.stage,
    },
    data: {
      status: body.status,
      approverId: body.approverId ?? undefined,
      notes: body.notes ?? undefined,
      approvedAt: body.status === 'PENDING' ? null : new Date(),
    },
  });

  if (approval.count === 0) {
    return NextResponse.json({ message: 'Approval stage not found' }, { status: 404 });
  }

  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      cycle: true,
      employee: { select: { id: true, firstName: true, lastName: true, managerId: true } },
    },
  });

  if (evaluation) {
    const approverUser = body.approverId
      ? await prisma.user.findFirst({ where: { employeeId: body.approverId }, select: { id: true } })
      : null;
    await prisma.evaluationActivity.create({
      data: {
        evaluationId: evaluation.id,
        actorId: approverUser?.id ?? null,
        action: 'APPROVAL_UPDATED',
        details: {
          stage: body.stage,
          status: body.status,
          notes: body.notes ?? null,
        },
      },
    });
  }

  if (body.status === 'REJECTED') {
    await prisma.evaluation.update({
      where: { id },
      data: { status: 'MANAGER_REVIEW' },
    });
  }

  if (body.stage === 'MANAGER' && body.status === 'APPROVED') {
    await prisma.evaluation.update({
      where: { id },
      data: { status: 'HR_REVIEW' },
    });
  }

  if (body.stage === 'HR' && body.status === 'APPROVED') {
    await prisma.evaluation.update({
      where: { id },
      data: { status: 'FINALIZED' },
    });
  }

  if (evaluation) {
    const managerId = evaluation.employee?.managerId;
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { employeeId: evaluation.employeeId },
          { employeeId: managerId ?? '' },
          { role: { in: ['admin', 'hr'] } },
        ],
      },
      select: { id: true, employeeId: true, role: true },
    });

    const userByEmployeeId = new Map(users.map((user) => [user.employeeId, user.id]));
    const hrUserIds = users.filter((user) => ['admin', 'hr'].includes(user.role)).map((user) => user.id);

    const notifications: Prisma.NotificationCreateManyInput[] = [];

    if (body.stage === 'MANAGER' && body.status === 'APPROVED') {
      hrUserIds.forEach((userId) => {
        notifications.push({
          userId,
          type: 'approval_needed',
          title: 'HR approval needed',
          message: `${evaluation.employee?.firstName} ${evaluation.employee?.lastName} is ready for HR approval.`,
          actionUrl: '/performance/evaluations',
          metadata: { evaluationId: evaluation.id, cycleId: evaluation.cycleId },
        });
      });
    }

    if (body.stage === 'HR' && body.status === 'APPROVED') {
      const employeeUserId = userByEmployeeId.get(evaluation.employeeId);
      if (employeeUserId) {
        notifications.push({
          userId: employeeUserId,
          type: 'rating_published',
          title: 'Evaluation finalized',
          message: `Your evaluation for ${evaluation.cycle?.name ?? 'the review cycle'} has been finalized.`,
          actionUrl: '/performance/evaluations',
          metadata: { evaluationId: evaluation.id, cycleId: evaluation.cycleId },
        });
      }
    }

    if (body.status === 'REJECTED') {
      const employeeUserId = userByEmployeeId.get(evaluation.employeeId);
      if (employeeUserId) {
        notifications.push({
          userId: employeeUserId,
          type: 'review_reminder',
          title: 'Review needs attention',
          message: `Your evaluation requires updates after ${body.stage.toLowerCase()} review.`,
          actionUrl: `/performance/self-assessment?evaluationId=${evaluation.id}`,
          metadata: { evaluationId: evaluation.id, cycleId: evaluation.cycleId },
        });
      }
      if (managerId) {
        const managerUserId = userByEmployeeId.get(managerId);
        if (managerUserId) {
          notifications.push({
            userId: managerUserId,
            type: 'review_reminder',
            title: 'Review needs attention',
            message: `The evaluation for ${evaluation.employee?.firstName} ${evaluation.employee?.lastName} was rejected in ${body.stage.toLowerCase()} review.`,
            actionUrl: '/performance/manager-review',
            metadata: { evaluationId: evaluation.id, cycleId: evaluation.cycleId },
          });
        }
      }
    }

    if (notifications.length) {
      await prisma.notification.createMany({ data: notifications });
    }
  }

  return NextResponse.json({ success: true });
}
