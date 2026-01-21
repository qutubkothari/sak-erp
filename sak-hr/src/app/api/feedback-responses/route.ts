import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type FeedbackResponseInput = {
  evaluationId: string;
  requestId: string;
  reviewerId: string;
  rating?: number;
  strengths?: string;
  improvements?: string;
};

export async function GET() {
  const responses = await prisma.feedbackResponse.findMany({
    orderBy: { createdAt: 'desc' },
    include: { evaluation: true, reviewer: true },
  });

  return NextResponse.json(responses);
}

export async function POST(request: Request) {
  const body = (await request.json()) as FeedbackResponseInput;

  if (!body.evaluationId || !body.requestId || !body.reviewerId) {
    return NextResponse.json({ message: 'Evaluation, request and reviewer are required' }, { status: 400 });
  }

  const response = await prisma.feedbackResponse.create({
    data: {
      evaluationId: body.evaluationId,
      requestId: body.requestId,
      reviewerId: body.reviewerId,
      rating: body.rating ?? null,
      strengths: body.strengths || null,
      improvements: body.improvements || null,
      submittedAt: new Date(),
    },
  });

  await prisma.feedbackRequest.update({
    where: { id: body.requestId },
    data: { status: 'SUBMITTED' },
  });

  return NextResponse.json(response, { status: 201 });
}
