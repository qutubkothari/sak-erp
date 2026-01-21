import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

type CalibrationEntryInput = {
  evaluationId: string;
  recommendedRating?: number;
  calibratedRating?: number;
  notes?: string;
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as CalibrationEntryInput;

  if (!body.evaluationId) {
    return NextResponse.json({ message: 'Evaluation is required' }, { status: 400 });
  }

  const entry = await prisma.calibrationEntry.create({
    data: {
      calibrationSessionId: id,
      evaluationId: body.evaluationId,
      recommendedRating: body.recommendedRating ?? null,
      calibratedRating: body.calibratedRating ?? null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
