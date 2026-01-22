import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type FeedbackRequestInput = {
  evaluationId: string;
  reviewerId: string;
  dueDate?: string;
};

export async function GET() {
  const requests = await prisma.feedbackRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { evaluation: { include: { employee: true } }, reviewer: true },
  });

  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const body = (await request.json()) as FeedbackRequestInput;

  if (!body.evaluationId || !body.reviewerId) {
    return NextResponse.json({ message: 'Evaluation and reviewer are required' }, { status: 400 });
  }

  const feedbackRequest = await prisma.feedbackRequest.create({
    data: {
      evaluationId: body.evaluationId,
      reviewerId: body.reviewerId,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });

  return NextResponse.json(feedbackRequest, { status: 201 });
}
