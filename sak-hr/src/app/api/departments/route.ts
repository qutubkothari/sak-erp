import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type DepartmentInput = {
  name: string;
};

export async function GET() {
  const departments = await prisma.department.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(departments);
}

export async function POST(request: Request) {
  const body = (await request.json()) as DepartmentInput;

  if (!body.name) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 });
  }

  const department = await prisma.department.create({
    data: { name: body.name },
  });

  return NextResponse.json(department, { status: 201 });
}
