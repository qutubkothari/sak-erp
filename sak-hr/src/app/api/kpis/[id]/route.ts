import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type KpiUpdate = {
  name?: string;
  description?: string | null;
  unit?: string | null;
  category?: string | null;
  target?: number | null;
  frequency?: string | null;
  dataSource?: string | null;
  weight?: number;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as KpiUpdate;

  const kpi = await prisma.kPI.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description ?? undefined,
      unit: body.unit ?? undefined,
      category: body.category ?? undefined,
      target: body.target ?? undefined,
      frequency: body.frequency ?? undefined,
      dataSource: body.dataSource ?? undefined,
      weight: body.weight,
    },
  });

  return NextResponse.json(kpi);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await prisma.kPI.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
