import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type EvaluationInput = {
  employeeId: string;
  cycleId: string;
};

export async function GET() {
  const evaluations = await prisma.evaluation.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      employee: true,
      cycle: true,
      items: true,
      approvals: true,
    },
  });

  return NextResponse.json(evaluations);
}

export async function POST(request: Request) {
  const body = (await request.json()) as EvaluationInput;

  if (!body.employeeId || !body.cycleId) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  const evaluation = await prisma.evaluation.create({
    data: {
      employeeId: body.employeeId,
      cycleId: body.cycleId,
      status: 'SELF_REVIEW',
      approvals: {
        create: [
          { stage: 'EMPLOYEE', status: 'PENDING' },
          { stage: 'MANAGER', status: 'PENDING' },
          { stage: 'HR', status: 'PENDING' },
        ],
      },
    },
  });

  return NextResponse.json(evaluation, { status: 201 });
}
