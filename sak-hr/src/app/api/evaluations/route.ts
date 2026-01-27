import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

type EvaluationInput = {
  employeeId: string;
  cycleId: string;
};

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const requestedEmployeeId = searchParams.get('employeeId');

  let whereClause: any = {};

  // If employeeId is provided in query, filter by it
  if (requestedEmployeeId) {
    whereClause.employeeId = requestedEmployeeId;
  } 
  // If user is logged in as employee (not HR/admin), only show their evaluations
  else if (session?.user?.employeeId && session?.user?.role === 'employee') {
    whereClause.employeeId = session.user.employeeId;
  }
  // For managers, show evaluations of their team members
  else if (session?.user?.employeeId && session?.user?.role === 'manager') {
    const managedEmployees = await prisma.employee.findMany({
      where: { managerId: session.user.employeeId },
      select: { id: true },
    });
    const managedIds = managedEmployees.map(e => e.id);
    // Show manager's own evaluations + their team's evaluations
    whereClause.employeeId = { in: [...managedIds, session.user.employeeId] };
  }
  // For HR/admin, show all evaluations (no filter)

  const evaluations = await prisma.evaluation.findMany({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
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
