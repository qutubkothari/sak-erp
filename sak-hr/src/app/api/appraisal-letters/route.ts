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
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const rawRole = (session.user.role || 'employee').toString().toLowerCase();
  const baseRole = rawRole === 'hr' ? 'admin' : rawRole;
  const employeeId = session.user.employeeId || undefined;

  const where =
    baseRole === 'admin'
      ? undefined
      : baseRole === 'manager' && employeeId
        ? { evaluation: { employee: { managerId: employeeId } } }
        : employeeId
          ? { evaluation: { employeeId } }
          : { evaluationId: '__none__' };

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
