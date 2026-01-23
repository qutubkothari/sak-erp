import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    weight?: number;
    type?: 'MERIT' | 'DEMERIT';
  };

  const entry = await prisma.meritDemerit.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      weight: body.weight ?? undefined,
      type: body.type ?? undefined,
    },
  });

  return NextResponse.json(entry);
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await prisma.meritDemerit.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
