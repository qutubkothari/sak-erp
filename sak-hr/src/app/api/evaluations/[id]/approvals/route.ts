import { NextResponse, type NextRequest } from 'next/server';
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

  return NextResponse.json({ success: true });
}
