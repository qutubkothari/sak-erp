import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

type AppraisalLetterInput = {
  evaluationId: string;
  subject: string;
  summary: string;
  rating?: number;
  adjustment?: string;
};

export async function GET() {
  const session = await auth();
  console.log('[Appraisal Letters API] Session:', {
    email: session?.user?.email,
    role: session?.user?.role,
    employeeId: session?.user?.employeeId,
  });

  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const rawRole = (session.user.role || 'employee').toString().toLowerCase();
  const baseRole = rawRole === 'hr' ? 'admin' : rawRole;
  const employeeId = session.user.employeeId || undefined;

  console.log('[Appraisal Letters API] Computed role:', {
    rawRole,
    baseRole,
    employeeId,
  });

  let where: any;
  
  if (baseRole === 'admin') {
    where = undefined;
    console.log('[Appraisal Letters API] Admin mode: showing all letters');
  } else if (baseRole === 'manager' && employeeId) {
    // For managers: show their team's letters + their own
    const managedEmployees = await prisma.employee.findMany({
      where: { managerId: employeeId },
      select: { id: true },
    });
    const managedIds = managedEmployees.map(e => e.id);
    where = { evaluation: { employeeId: { in: [...managedIds, employeeId] } } };
    console.log('[Appraisal Letters API] Manager mode:', {
      managerId: employeeId,
      teamSize: managedIds.length,
      showingFor: [...managedIds, employeeId],
    });
  } else if (employeeId) {
    where = { evaluation: { employeeId } };
    console.log('[Appraisal Letters API] Employee mode:', {
      employeeId,
      filteringBy: where,
    });
  } else {
    where = { evaluationId: '__none__' };
    console.log('[Appraisal Letters API] No employeeId - returning empty');
  }

  const letters = await prisma.appraisalLetter.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      evaluation: {
        include: {
          employee: true,
          cycle: true,
        },
      },
      approvedBy: true,
    },
  });

  console.log('[Appraisal Letters API] Found letters:', letters.length);
  letters.forEach((letter, i) => {
    console.log(`  Letter ${i + 1}:`, {
      subject: letter.subject,
      employee: `${letter.evaluation.employee.firstName} ${letter.evaluation.employee.lastName}`,
      employeeId: letter.evaluation.employeeId,
      cycle: letter.evaluation.cycle.name,
    });
  });

  return NextResponse.json(letters);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const rawRole = (session.user.role || 'employee').toString().toLowerCase();
  const baseRole = rawRole === 'hr' ? 'admin' : rawRole;
  if (baseRole !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as AppraisalLetterInput;

  if (!body.evaluationId || !body.subject || !body.summary) {
    return NextResponse.json({ message: 'Evaluation, subject, and summary are required' }, { status: 400 });
  }

  const existing = await prisma.appraisalLetter.findUnique({
    where: { evaluationId: body.evaluationId },
  });

  if (existing) {
    return NextResponse.json({ message: 'Appraisal letter already exists for this evaluation' }, { status: 409 });
  }

  const letter = await prisma.appraisalLetter.create({
    data: {
      evaluationId: body.evaluationId,
      subject: body.subject,
      summary: body.summary,
      rating: body.rating ?? null,
      adjustment: body.adjustment ?? null,
    },
  });

  return NextResponse.json(letter, { status: 201 });
}
