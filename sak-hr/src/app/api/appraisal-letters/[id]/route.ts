import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ApprovalUpdate = {
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedById?: string;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const rawRole = (session.user.role || 'employee').toString().toLowerCase();
  const baseRole = ['hr', 'admin'].includes(rawRole) ? 'admin' : rawRole;
  const sessionEmployeeId = session.user.employeeId || undefined;

  const { id } = await context.params;

  const letter = await prisma.appraisalLetter.findUnique({
    where: { id },
    include: {
      evaluation: {
        include: {
          employee: true,
          cycle: true,
        },
      },
      approvedBy: true,
    },
  });

  if (!letter) {
    return NextResponse.json({ message: 'Appraisal letter not found' }, { status: 404 });
  }

  const letterEmployeeId = letter.evaluation.employeeId;
  const managerId = letter.evaluation.employee.managerId;

  if (
    baseRole !== 'admin' &&
    (!sessionEmployeeId ||
      (baseRole === 'manager' ? managerId !== sessionEmployeeId : letterEmployeeId !== sessionEmployeeId))
  ) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(letter);
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const rawRole = (session.user.role || 'employee').toString().toLowerCase();
  const baseRole = ['hr', 'admin'].includes(rawRole) ? 'admin' : rawRole;
  const sessionEmployeeId = session.user.employeeId || undefined;
  if (baseRole !== 'admin' && baseRole !== 'manager') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as ApprovalUpdate;

  const letter = await prisma.appraisalLetter.findUnique({
    where: { id },
    include: { evaluation: { include: { employee: true } } },
  });

  if (!letter) {
    return NextResponse.json({ message: 'Appraisal letter not found' }, { status: 404 });
  }

  if (baseRole === 'manager') {
    if (!sessionEmployeeId || letter.evaluation.employee.managerId !== sessionEmployeeId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
  }

  const approvedById = baseRole === 'manager' ? sessionEmployeeId ?? null : body.approvedById ?? null;

  const updated = await prisma.appraisalLetter.update({
    where: { id },
    data: {
      approvalStatus: body.approvalStatus,
      approvedById,
      approvedAt: body.approvalStatus === 'APPROVED' ? new Date() : null,
    },
  });

  return NextResponse.json(updated);
}
