import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type CompetencyInput = {
  name: string;
  description?: string;
  weight?: number;
};

export async function GET() {
  const competencies = await prisma.competency.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(competencies);
}

export async function POST(request: Request) {
  const body = (await request.json()) as CompetencyInput;

  if (!body.name) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 });
  }

  const competency = await prisma.competency.create({
    data: {
      name: body.name,
      description: body.description || null,
      weight: body.weight ?? 1,
    },
  });

  return NextResponse.json(competency, { status: 201 });
}
