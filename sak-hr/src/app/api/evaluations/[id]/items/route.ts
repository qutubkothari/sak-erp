import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type EvaluationItemInput = {
  type: 'COMPETENCY' | 'KPI';
  competencyId?: string;
  kpiId?: string;
  weight?: number;
  comments?: string;
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json()) as EvaluationItemInput;

  if (!body.type) {
    return NextResponse.json({ message: 'Type is required' }, { status: 400 });
  }

  const item = await prisma.evaluationItem.create({
    data: {
      evaluationId: params.id,
      type: body.type,
      competencyId: body.competencyId || null,
      kpiId: body.kpiId || null,
      weight: body.weight ?? 1,
      comments: body.comments || null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
