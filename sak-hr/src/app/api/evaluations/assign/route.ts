import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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
    
    // Note: Notification system disabled due to User-Employee unlinking
    // TODO: Implement notification system based on email or alternative approach
  }

  return NextResponse.json({ created: created.length, skipped: existingIds.size });
}
