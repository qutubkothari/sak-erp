import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    include: { employee: true, cycle: true, items: true, approvals: true },
  });

  if (!evaluation) {
    return NextResponse.json({ message: 'Evaluation not found' }, { status: 404 });
  }

  return NextResponse.json(evaluation);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: string;
    overallScore?: number;
    selfScore?: number;
    managerScore?: number;
    finalRating?: number;
  };

  const evaluation = await prisma.evaluation.update({
    where: { id },
    data: {
      status: body.status as any,
      overallScore: body.overallScore ?? undefined,
      selfScore: body.selfScore ?? undefined,
      managerScore: body.managerScore ?? undefined,
      finalRating: body.finalRating ?? undefined,
    },
  });

  return NextResponse.json(evaluation);
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  await prisma.$transaction([
    prisma.feedbackResponse.deleteMany({ where: { evaluationId: id } }),
    prisma.feedbackRequest.deleteMany({ where: { evaluationId: id } }),
    prisma.calibrationEntry.deleteMany({ where: { evaluationId: id } }),
    prisma.appraisalLetter.deleteMany({ where: { evaluationId: id } }),
    prisma.improvementPlan.deleteMany({ where: { evaluationId: id } }),
    prisma.evaluationEvidence.deleteMany({ where: { evaluationId: id } }),
    prisma.evaluationItem.deleteMany({ where: { evaluationId: id } }),
    prisma.evaluationApproval.deleteMany({ where: { evaluationId: id } }),
    prisma.evaluationActivity.deleteMany({ where: { evaluationId: id } }),
    prisma.managerReview.deleteMany({ where: { evaluationId: id } }),
    prisma.selfAssessment.deleteMany({ where: { evaluationId: id } }),
    prisma.evaluation.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
