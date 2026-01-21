import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: params.id },
    include: { employee: true, cycle: true, items: true, approvals: true },
  });

  if (!evaluation) {
    return NextResponse.json({ message: 'Evaluation not found' }, { status: 404 });
  }

  return NextResponse.json(evaluation);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json()) as {
    status?: string;
    overallScore?: number;
    selfScore?: number;
    managerScore?: number;
    finalRating?: number;
  };

  const evaluation = await prisma.evaluation.update({
    where: { id: params.id },
    data: {
      status: body.status as any,
      overallScore: body.overallScore ?? undefined,
      selfScore: body.selfScore ?? undefined,
      managerScore: body.managerScore ?? undefined,
      finalRating: body.finalRating ?? undefined,
    },
  });

  return NextResponse.json(evaluation);
}
