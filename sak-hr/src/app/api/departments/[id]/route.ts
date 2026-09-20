import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as { name?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 });
  }

  const department = await prisma.department.update({
    where: { id },
    data: { name: body.name.trim() },
  });

  return NextResponse.json(department);
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  await prisma.department.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
