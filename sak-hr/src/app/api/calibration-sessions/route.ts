import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type CalibrationSessionInput = {
  name: string;
  cycleId: string;
  status?: string;
};

export async function GET() {
  const sessions = await prisma.calibrationSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: { cycle: true, entries: true },
  });

  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const body = (await request.json()) as CalibrationSessionInput;

  if (!body.name || !body.cycleId) {
    return NextResponse.json({ message: 'Name and cycle are required' }, { status: 400 });
  }

  const session = await prisma.calibrationSession.create({
    data: {
      name: body.name,
      cycleId: body.cycleId,
      status: body.status || 'ACTIVE',
    },
  });

  return NextResponse.json(session, { status: 201 });
}
