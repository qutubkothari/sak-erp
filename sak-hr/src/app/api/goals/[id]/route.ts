import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    category?: string;
    priority?: string;
    targetDate?: string;
    measurableMetric?: string;
    alignedCompetency?: string | null;
    status?: string;
    progress?: number;
  };

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      title: body.title ?? undefined,
      description: body.description ?? undefined,
      category: body.category ?? undefined,
      priority: body.priority ?? undefined,
      targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
      measurableMetric: body.measurableMetric ?? undefined,
      alignedCompetency: body.alignedCompetency ?? undefined,
      status: body.status ?? undefined,
      progress: body.progress ?? undefined,
    },
  });

  return NextResponse.json(goal);
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
