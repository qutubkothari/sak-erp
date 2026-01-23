import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type KpiInput = {
  name: string;
  description?: string;
  unit?: string;
  category?: string;
  target?: number;
  frequency?: string;
  dataSource?: string;
  weight?: number;
};

export async function GET() {
  const kpis = await prisma.kPI.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(kpis);
}

export async function POST(request: Request) {
  const body = (await request.json()) as KpiInput;

  if (!body.name) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 });
  }

  const kpi = await prisma.kPI.create({
    data: {
      name: body.name,
      description: body.description || null,
      unit: body.unit || null,
      category: body.category || null,
      target: body.target ?? null,
      frequency: body.frequency || null,
      dataSource: body.dataSource || null,
      weight: body.weight ?? 1,
    },
  });

  return NextResponse.json(kpi, { status: 201 });
}
