import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const evaluationId = searchParams.get('evaluationId');

  if (!evaluationId) {
    return NextResponse.json({ message: 'evaluationId is required' }, { status: 400 });
  }

  const review = await prisma.managerReview.findUnique({
    where: { evaluationId },
  });

  return NextResponse.json(review);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    evaluationId: string;
    managerId?: string;
    overallRating: number;
    managerComments: string;
    strengths: string;
    areasForImprovement: string;
    developmentPlan: string;
    salaryRecommendation: 'no-change' | 'increase' | 'promotion';
    salaryIncreasePercent?: number;
    recommendedPromotion?: string;
  };

  if (!body.evaluationId) {
    return NextResponse.json({ message: 'evaluationId is required' }, { status: 400 });
  }

  const review = await prisma.managerReview.upsert({
    where: { evaluationId: body.evaluationId },
    create: {
      evaluationId: body.evaluationId,
      managerId: body.managerId || null,
      overallRating: body.overallRating,
      managerComments: body.managerComments,
      strengths: body.strengths,
      areasForImprovement: body.areasForImprovement,
      developmentPlan: body.developmentPlan,
      salaryRecommendation: body.salaryRecommendation,
      salaryIncreasePercent: body.salaryIncreasePercent ?? null,
      recommendedPromotion: body.recommendedPromotion || null,
    },
    update: {
      managerId: body.managerId || null,
      overallRating: body.overallRating,
      managerComments: body.managerComments,
      strengths: body.strengths,
      areasForImprovement: body.areasForImprovement,
      developmentPlan: body.developmentPlan,
      salaryRecommendation: body.salaryRecommendation,
      salaryIncreasePercent: body.salaryIncreasePercent ?? null,
      recommendedPromotion: body.recommendedPromotion || null,
    },
  });

  // Note: User-Employee linking is disabled
  // TODO: Track activity with email-based user lookup
  await prisma.evaluationActivity.create({
    data: {
      evaluationId: body.evaluationId,
      actorId: null,
      action: 'MANAGER_REVIEW_SUBMITTED',
      details: { overallRating: body.overallRating },
    },
  });

  return NextResponse.json(review, { status: 201 });
}
