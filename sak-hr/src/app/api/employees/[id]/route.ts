import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type EmployeeUpdate = {
  code?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  hireDate?: string;
  password?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'PROBATION';
  departmentId?: string | null;
  roleId?: string | null;
  managerId?: string | null;
  location?: string | null;
  nationality?: string | null;
  emiratesId?: string | null;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as EmployeeUpdate;

  if (body.password && body.password.length < 6) {
    return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      code: body.code,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
      status: body.status,
      employmentType: body.employmentType,
      departmentId: body.departmentId ?? undefined,
      roleId: body.roleId ?? undefined,
      managerId: body.managerId ?? undefined,
      location: body.location ?? undefined,
      nationality: body.nationality ?? undefined,
      emiratesId: body.emiratesId ?? undefined,
    },
  });

  if (body.password) {
    const hashed = await bcrypt.hash(body.password, 10);
    const existingUser = await prisma.user.findFirst({ where: { employeeId: id } });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash: hashed,
          email: body.email ?? existingUser.email,
        },
      });
    } else if (employee.email) {
      await prisma.user.create({
        data: {
          email: employee.email,
          passwordHash: hashed,
          role: 'employee',
          employeeId: employee.id,
        },
      });
    }
  }

  return NextResponse.json(employee);
}
