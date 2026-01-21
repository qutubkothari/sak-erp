import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await prisma.calibrationSession.findUnique({
    where: { id },
    include: {
      cycle: true,
      entries: {
        include: {
          evaluation: {
            include: { employee: true },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ message: 'Calibration session not found' }, { status: 404 });
  }

  return NextResponse.json(session);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { status?: string };

  const session = await prisma.calibrationSession.update({
    where: { id },
    data: { status: body.status || undefined },
  });

  return NextResponse.json(session);
}
