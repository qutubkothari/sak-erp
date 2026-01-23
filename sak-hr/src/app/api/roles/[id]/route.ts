import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RoleUpdate = {
  title?: string;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as RoleUpdate;

  if (!body.title?.trim()) {
    return NextResponse.json({ message: 'Title is required' }, { status: 400 });
  }

  const role = await prisma.role.update({
    where: { id },
    data: { title: body.title.trim() },
  });

  return NextResponse.json(role);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;

  const assignedCount = await prisma.employee.count({
    where: { roleId: id },
  });

  if (assignedCount > 0) {
    return NextResponse.json(
      { message: 'Role is assigned to employees. Reassign before deleting.' },
      { status: 400 }
    );
  }

  await prisma.role.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
