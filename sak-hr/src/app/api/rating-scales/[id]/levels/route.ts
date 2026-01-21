import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

type RatingLevelInput = {
  label: string;
  minScore: number;
  maxScore: number;
  description?: string;
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as RatingLevelInput;

  if (!body.label || body.minScore == null || body.maxScore == null) {
    return NextResponse.json({ message: 'Label and score range are required' }, { status: 400 });
  }

  const level = await prisma.ratingLevel.create({
    data: {
      ratingScaleId: id,
      label: body.label,
      minScore: Number(body.minScore),
      maxScore: Number(body.maxScore),
      description: body.description || null,
    },
  });

  return NextResponse.json(level, { status: 201 });
}
