import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type EvaluationInput = {
  employeeId: string;
  cycleId: string;
};

export async function GET() {
  const evaluations = await prisma.evaluation.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      employee: true,
      cycle: true,
      items: true,
      approvals: true,
    },
  });

  return NextResponse.json(evaluations);
}

export async function POST(request: Request) {
  const body = (await request.json()) as EvaluationInput;

  if (!body.employeeId || !body.cycleId) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  const evaluation = await prisma.evaluation.create({
    data: {
      employeeId: body.employeeId,
      cycleId: body.cycleId,
      status: 'SELF_REVIEW',
      approvals: {
        create: [
          { stage: 'EMPLOYEE', status: 'PENDING' },
          { stage: 'MANAGER', status: 'PENDING' },
          { stage: 'HR', status: 'PENDING' },
        ],
      },
    },
  });

  await prisma.evaluationActivity.create({
    data: {
      evaluationId: evaluation.id,
      action: 'EVALUATION_CREATED',
      details: { cycleId: body.cycleId, employeeId: body.employeeId },
    },
  });

  const [employee, cycle] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: body.employeeId },
      select: { id: true, firstName: true, lastName: true, managerId: true },
    }),
    prisma.reviewCycle.findUnique({
      where: { id: body.cycleId },
      select: { name: true },
    }),
  ]);

  if (employee) {
    const users = await prisma.user.findMany({
      where: { employeeId: { in: [employee.id, employee.managerId || ''] } },
      select: { id: true, employeeId: true },
    });
    const userByEmployeeId = new Map(users.map((user) => [user.employeeId, user.id]));

    const notificationData: Prisma.NotificationCreateManyInput[] = [];

    const employeeUserId = userByEmployeeId.get(employee.id);
    if (employeeUserId) {
      notificationData.push({
        userId: employeeUserId,
        type: 'cycle_started',
        title: 'Self-assessment opened',
        message: `Your self-assessment for ${cycle?.name ?? 'the review cycle'} is ready.`,
        actionUrl: `/performance/self-assessment?evaluationId=${evaluation.id}`,
        metadata: { evaluationId: evaluation.id, cycleId: body.cycleId },
      });
    }

    if (employee.managerId) {
      const managerUserId = userByEmployeeId.get(employee.managerId);
      if (managerUserId) {
        notificationData.push({
          userId: managerUserId,
          type: 'approval_needed',
          title: 'Upcoming manager review',
          message: `${employee.firstName} ${employee.lastName} has a new evaluation in ${cycle?.name ?? 'the review cycle'}.`,
          actionUrl: `/performance/manager-review?evaluationId=${evaluation.id}`,
          metadata: { evaluationId: evaluation.id, employeeId: employee.id, cycleId: body.cycleId },
        });
      }
    }

    if (notificationData.length) {
      await prisma.notification.createMany({ data: notificationData });
    }
  }

  return NextResponse.json(evaluation, { status: 201 });
}
