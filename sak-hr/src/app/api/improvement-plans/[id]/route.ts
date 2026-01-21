import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ImprovementPlanUpdate = {
  status?: string;
  endDate?: string;
  objectives?: string;
  supportPlan?: string;
  checkpoints?: string;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const plan = await prisma.improvementPlan.findUnique({
    where: { id },
    include: {
      evaluation: { include: { employee: true, cycle: true } },
      manager: true,
    },
  });

  if (!plan) {
    return NextResponse.json({ message: 'Improvement plan not found' }, { status: 404 });
  }

  return NextResponse.json(plan);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as ImprovementPlanUpdate;

  const plan = await prisma.improvementPlan.update({
    where: { id },
    data: {
      status: body.status,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      objectives: body.objectives,
      supportPlan: body.supportPlan,
      checkpoints: body.checkpoints,
    },
  });

  return NextResponse.json(plan);
}
