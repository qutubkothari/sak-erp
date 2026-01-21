import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ReviewCycleUpdate = {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as ReviewCycleUpdate;

  const cycle = await prisma.reviewCycle.update({
    where: { id },
    data: {
      name: body.name,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      status: body.status,
    },
  });

  return NextResponse.json(cycle);
}
