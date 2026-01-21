import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type EmployeeInput = {
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  hireDate: string;
  departmentId?: string;
  roleId?: string;
  managerId?: string;
  location?: string;
  nationality?: string;
  emiratesId?: string;
};

export async function GET() {
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: 'desc' },
    include: { department: true, role: true, manager: true },
  });

  return NextResponse.json(employees);
}

export async function POST(request: Request) {
  const body = (await request.json()) as EmployeeInput;

  if (!body.code || !body.firstName || !body.lastName || !body.email || !body.hireDate) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: {
      code: body.code,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      hireDate: new Date(body.hireDate),
      departmentId: body.departmentId || null,
      roleId: body.roleId || null,
      managerId: body.managerId || null,
      location: body.location || null,
      nationality: body.nationality || null,
      emiratesId: body.emiratesId || null,
    },
  });

  return NextResponse.json(employee, { status: 201 });
}
