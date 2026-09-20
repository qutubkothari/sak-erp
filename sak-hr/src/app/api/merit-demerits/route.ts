import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type MeritDemeritInput = {
  name: string;
  description?: string;
  weight?: number;
  type: 'MERIT' | 'DEMERIT';
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'MERIT' | 'DEMERIT' | null;

  const entries = await prisma.meritDemerit.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const body = (await request.json()) as MeritDemeritInput;

  if (!body.name || !body.type) {
    return NextResponse.json({ message: 'Name and type are required' }, { status: 400 });
  }

  const entry = await prisma.meritDemerit.create({
    data: {
      name: body.name,
      description: body.description || null,
      weight: body.weight ?? 1,
      type: body.type,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
