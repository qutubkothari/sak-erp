import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const activity = await prisma.evaluationActivity.findMany({
    where: { evaluationId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      actor: { select: { id: true, email: true } },
    },
  });

  return NextResponse.json(activity);
}
