import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

type EmployeeInput = {
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  hireDate: string;
  password?: string;
  departmentId?: string;
  roleId?: string;
  managerId?: string;
  location?: string;
  nationality?: string;
  emiratesId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'PROBATION';
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const managerId = searchParams.get('managerId');

  const employees = await prisma.employee.findMany({
    where: managerId ? { managerId } : undefined,
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

  if (body.password && body.password.length < 6) {
    return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
  }

  if (body.password) {
    const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
    if (existingUser) {
      return NextResponse.json({ message: 'Login user already exists for this email' }, { status: 400 });
    }
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
      status: body.status ?? 'ACTIVE',
      employmentType: body.employmentType ?? 'FULL_TIME',
    },
  });

  if (body.password) {
    const hashed = await bcrypt.hash(body.password, 10);
    await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: hashed,
        role: 'employee',
        employeeId: employee.id,
      },
    });
  }

  return NextResponse.json(employee, { status: 201 });
}
