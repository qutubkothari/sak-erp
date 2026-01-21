import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type AppraisalLetterInput = {
  evaluationId: string;
  subject: string;
  summary: string;
  rating?: number;
  adjustment?: string;
};

export async function GET() {
  const letters = await prisma.appraisalLetter.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      evaluation: {
        include: {
          employee: true,
          cycle: true,
        },
      },
    },
  });

  return NextResponse.json(letters);
}

export async function POST(request: Request) {
  const body = (await request.json()) as AppraisalLetterInput;

  if (!body.evaluationId || !body.subject || !body.summary) {
    return NextResponse.json({ message: 'Evaluation, subject, and summary are required' }, { status: 400 });
  }

  const existing = await prisma.appraisalLetter.findUnique({
    where: { evaluationId: body.evaluationId },
  });

  if (existing) {
    return NextResponse.json({ message: 'Appraisal letter already exists for this evaluation' }, { status: 409 });
  }

  const letter = await prisma.appraisalLetter.create({
    data: {
      evaluationId: body.evaluationId,
      subject: body.subject,
      summary: body.summary,
      rating: body.rating ?? null,
      adjustment: body.adjustment ?? null,
    },
  });

  return NextResponse.json(letter, { status: 201 });
}
