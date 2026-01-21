import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ReviewCycleInput = {
  name: string;
  startDate: string;
  endDate: string;
  status: string;
};

export async function GET() {
  const cycles = await prisma.reviewCycle.findMany({
    orderBy: { startDate: 'desc' },
  });

  return NextResponse.json(cycles);
}

export async function POST(request: Request) {
  const body = (await request.json()) as ReviewCycleInput;

  if (!body.name || !body.startDate || !body.endDate) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  const cycle = await prisma.reviewCycle.create({
    data: {
      name: body.name,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      status: body.status || 'DRAFT',
    },
  });

  return NextResponse.json(cycle, { status: 201 });
}
