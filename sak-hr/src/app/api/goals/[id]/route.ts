import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: string;
    progress?: number;
  };

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      status: body.status ?? undefined,
      progress: body.progress ?? undefined,
    },
  });

  return NextResponse.json(goal);
}
