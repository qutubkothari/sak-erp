import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const evaluationId = searchParams.get('evaluationId');

  if (!evaluationId) {
    return NextResponse.json({ message: 'evaluationId is required' }, { status: 400 });
  }

  const assessment = await prisma.selfAssessment.findUnique({
    where: { evaluationId },
  });

  return NextResponse.json(assessment);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    evaluationId: string;
    accomplishments: string;
    challenges: string;
    developmentNeeds: string;
    comments?: string;
  };

  if (!body.evaluationId) {
    return NextResponse.json({ message: 'evaluationId is required' }, { status: 400 });
  }

  const assessment = await prisma.selfAssessment.upsert({
    where: { evaluationId: body.evaluationId },
    create: {
      evaluationId: body.evaluationId,
      accomplishments: body.accomplishments,
      challenges: body.challenges,
      developmentNeeds: body.developmentNeeds,
      comments: body.comments || null,
    },
    update: {
      accomplishments: body.accomplishments,
      challenges: body.challenges,
      developmentNeeds: body.developmentNeeds,
      comments: body.comments || null,
    },
  });

  return NextResponse.json(assessment, { status: 201 });
}
