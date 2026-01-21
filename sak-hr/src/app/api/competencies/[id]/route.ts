import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CompetencyUpdate = {
  name?: string;
  description?: string | null;
  weight?: number;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as CompetencyUpdate;

  const competency = await prisma.competency.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description ?? undefined,
      weight: body.weight,
    },
  });

  return NextResponse.json(competency);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await prisma.competency.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
