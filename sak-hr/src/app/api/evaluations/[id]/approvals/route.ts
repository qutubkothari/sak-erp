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
    // Note: User-Employee linking is disabled - approverUser tracking removed
    await prisma.evaluationActivity.create({
      data: {
        evaluationId: evaluation.id,
        actorId: null,
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
    // Note: Notification system disabled due to User-Employee unlinking
    // TODO: Implement notification system based on email or alternative approach
  }

  return NextResponse.json({ success: true });
}
