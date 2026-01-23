import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

type EvaluationItemInput = {
  type: 'COMPETENCY' | 'KPI' | 'MERIT' | 'DEMERIT';
  competencyId?: string;
  kpiId?: string;
  meritDemeritId?: string;
  weight?: number;
  selfScore?: number;
  managerScore?: number;
  finalScore?: number;
  comments?: string;
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as EvaluationItemInput;

  if (!body.type) {
    return NextResponse.json({ message: 'Type is required' }, { status: 400 });
  }

  const item = await prisma.evaluationItem.create({
    data: {
      evaluationId: id,
      type: body.type,
      competencyId: body.competencyId || null,
      kpiId: body.kpiId || null,
      meritDemeritId: body.meritDemeritId || null,
      weight: body.weight ?? 1,
      selfScore: body.selfScore ?? null,
      managerScore: body.managerScore ?? null,
      finalScore: body.finalScore ?? null,
      comments: body.comments || null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    itemId: string;
    selfScore?: number;
    managerScore?: number;
    finalScore?: number;
    comments?: string;
    weight?: number;
  };

  if (!body.itemId) {
    return NextResponse.json({ message: 'itemId is required' }, { status: 400 });
  }

  const item = await prisma.evaluationItem.update({
    where: { id: body.itemId },
    data: {
      selfScore: body.selfScore ?? undefined,
      managerScore: body.managerScore ?? undefined,
      finalScore: body.finalScore ?? undefined,
      comments: body.comments ?? undefined,
      weight: body.weight ?? undefined,
    },
  });

  return NextResponse.json(item);
}
