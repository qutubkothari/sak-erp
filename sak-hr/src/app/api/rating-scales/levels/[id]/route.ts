import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RatingLevelUpdate = {
  label?: string;
  minScore?: number;
  maxScore?: number;
  description?: string;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as RatingLevelUpdate;

  if (!body.label || body.minScore == null || body.maxScore == null) {
    return NextResponse.json({ message: 'Label and score range are required' }, { status: 400 });
  }

  const level = await prisma.ratingLevel.update({
    where: { id },
    data: {
      label: body.label,
      minScore: Number(body.minScore),
      maxScore: Number(body.maxScore),
      description: body.description || null,
    },
  });

  return NextResponse.json(level);
}
