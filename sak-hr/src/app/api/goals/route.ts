import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type GoalInput = {
  employeeId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  targetDate: string;
  measurableMetric: string;
  alignedCompetency?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');

  const goals = await prisma.goal.findMany({
    where: employeeId ? { employeeId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(goals);
}

export async function POST(request: Request) {
  const body = (await request.json()) as GoalInput;

  if (!body.employeeId || !body.title || !body.description || !body.category || !body.priority || !body.targetDate || !body.measurableMetric) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  const goal = await prisma.goal.create({
    data: {
      employeeId: body.employeeId,
      title: body.title,
      description: body.description,
      category: body.category,
      priority: body.priority,
      targetDate: new Date(body.targetDate),
      measurableMetric: body.measurableMetric,
      alignedCompetency: body.alignedCompetency || null,
      status: 'active',
      progress: 0,
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
