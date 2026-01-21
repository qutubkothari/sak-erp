import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ApprovalUpdate = {
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedById?: string;
};

export async function GET(_request: Request, context: RouteContext) {
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
    },
  });

  if (!letter) {
    return NextResponse.json({ message: 'Appraisal letter not found' }, { status: 404 });
  }

  return NextResponse.json(letter);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as ApprovalUpdate;

  const updated = await prisma.appraisalLetter.update({
    where: { id },
    data: {
      approvalStatus: body.approvalStatus,
      approvedById: body.approvedById ?? null,
      approvedAt: body.approvalStatus === 'APPROVED' ? new Date() : null,
    },
  });

  return NextResponse.json(updated);
}
