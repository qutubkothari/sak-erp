import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const evidence = await prisma.evaluationEvidence.findMany({
    where: { evaluationId: id },
    orderBy: { createdAt: 'desc' },
    include: { uploadedBy: true },
  });

  return NextResponse.json(evidence);
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    title: string;
    url: string;
    notes?: string;
    stage: 'SELF_ASSESSMENT' | 'MANAGER_REVIEW' | 'HR_REVIEW';
    uploadedById?: string;
  };

  if (!body.title || !body.url || !body.stage) {
    return NextResponse.json({ message: 'title, url, and stage are required' }, { status: 400 });
  }

  const evidence = await prisma.evaluationEvidence.create({
    data: {
      evaluationId: id,
      title: body.title,
      url: body.url,
      notes: body.notes ?? null,
      stage: body.stage,
      uploadedById: body.uploadedById ?? null,
    },
  });

  return NextResponse.json(evidence, { status: 201 });
}
