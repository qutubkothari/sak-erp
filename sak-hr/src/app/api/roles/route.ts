import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RoleInput = {
  title: string;
};

export async function GET() {
  const roles = await prisma.role.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(roles);
}

export async function POST(request: Request) {
  const body = (await request.json()) as RoleInput;

  if (!body.title) {
    return NextResponse.json({ message: 'Title is required' }, { status: 400 });
  }

  const role = await prisma.role.create({
    data: { title: body.title },
  });

  return NextResponse.json(role, { status: 201 });
}
