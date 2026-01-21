import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type KpiUpdate = {
  name?: string;
  description?: string | null;
  unit?: string | null;
  weight?: number;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as KpiUpdate;

  const kpi = await prisma.kpi.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description ?? undefined,
      unit: body.unit ?? undefined,
      weight: body.weight,
    },
  });

  return NextResponse.json(kpi);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await prisma.kpi.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
