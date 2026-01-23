import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type AssignInput = {
  cycleId: string;
  departmentId: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AssignInput;

  if (!body.cycleId || !body.departmentId) {
    return NextResponse.json({ message: 'cycleId and departmentId are required' }, { status: 400 });
  }

  const employees = await prisma.employee.findMany({
    where: {
      departmentId: body.departmentId,
      status: 'ACTIVE',
    },
    select: { id: true, firstName: true, lastName: true, managerId: true },
  });

  if (employees.length === 0) {
    return NextResponse.json({ created: 0, skipped: 0, message: 'No active employees in department' });
  }

  const employeeIds = employees.map((employee) => employee.id);

  const existing = await prisma.evaluation.findMany({
    where: {
      cycleId: body.cycleId,
      employeeId: { in: employeeIds },
    },
    select: { employeeId: true },
  });

  const existingIds = new Set(existing.map((evalItem) => evalItem.employeeId));
  const toCreate = employeeIds.filter((id) => !existingIds.has(id));

  const [cycle, created] = await Promise.all([
    prisma.reviewCycle.findUnique({
      where: { id: body.cycleId },
      select: { name: true },
    }),
    prisma.$transaction(
      toCreate.map((employeeId) =>
        prisma.evaluation.create({
          data: {
            employeeId,
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
        })
      )
    ),
  ]);

  if (created.length) {
    await prisma.evaluationActivity.createMany({
      data: created.map((evaluation, index) => ({
        evaluationId: evaluation.id,
        action: 'EVALUATION_CREATED',
        details: { cycleId: body.cycleId, employeeId: toCreate[index] },
      })),
    });

    const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
    const managerIds = employees
      .map((employee) => employee.managerId)
      .filter((managerId): managerId is string => Boolean(managerId));
    const userRows = await prisma.user.findMany({
      where: { employeeId: { in: [...toCreate, ...managerIds] } },
      select: { id: true, employeeId: true },
    });
    const userByEmployeeId = new Map(userRows.map((user) => [user.employeeId, user.id]));

    const notificationData = created.flatMap((evaluation, index) => {
      const employeeId = toCreate[index];
      const employee = employeeMap.get(employeeId);
      if (!employee) return [];

      const notifications = [] as Array<{
        userId: string;
        type: string;
        title: string;
        message: string;
        actionUrl?: string;
        metadata?: Record<string, unknown>;
      }>;

      const employeeUserId = userByEmployeeId.get(employeeId);
      if (employeeUserId) {
        notifications.push({
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
          notifications.push({
            userId: managerUserId,
            type: 'approval_needed',
            title: 'Upcoming manager review',
            message: `${employee.firstName} ${employee.lastName} has a new evaluation in ${cycle?.name ?? 'the review cycle'}.`,
            actionUrl: `/performance/manager-review?evaluationId=${evaluation.id}`,
            metadata: { evaluationId: evaluation.id, employeeId: employeeId, cycleId: body.cycleId },
          });
        }
      }

      return notifications;
    });

    if (notificationData.length) {
      await prisma.notification.createMany({ data: notificationData });
    }
  }

  return NextResponse.json({ created: created.length, skipped: existingIds.size });
}
