import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ImprovementPlanInput = {
  evaluationId: string;
  managerId?: string;
  status?: string;
  startDate: string;
  endDate?: string;
  objectives: string;
  supportPlan?: string;
  checkpoints?: string;
};

export async function GET() {
  const plans = await prisma.improvementPlan.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      evaluation: { include: { employee: true, cycle: true } },
      manager: true,
      approvedBy: true,
    },
  });

  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  const body = (await request.json()) as ImprovementPlanInput;

  if (!body.evaluationId || !body.startDate || !body.objectives) {
    return NextResponse.json({ message: 'Evaluation, start date, and objectives are required' }, { status: 400 });
  }

  const existing = await prisma.improvementPlan.findUnique({
    where: { evaluationId: body.evaluationId },
  });

  if (existing) {
    return NextResponse.json({ message: 'Improvement plan already exists for this evaluation' }, { status: 409 });
  }

  const plan = await prisma.improvementPlan.create({
    data: {
      evaluationId: body.evaluationId,
      managerId: body.managerId ?? null,
      status: body.status ?? 'ACTIVE',
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      objectives: body.objectives,
      supportPlan: body.supportPlan ?? null,
      checkpoints: body.checkpoints ?? null,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
