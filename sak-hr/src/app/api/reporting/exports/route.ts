import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const escapeValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const toCsv = (rows: Array<Array<string | number | null | undefined>>) =>
  rows.map((row) => row.map(escapeValue).join(',')).join('\n');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'employees';

  if (type === 'employees') {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
      include: { department: true, role: true, manager: true },
    });

    const rows = [
      [
        'Code',
        'First Name',
        'Last Name',
        'Email',
        'Status',
        'Employment Type',
        'Hire Date',
        'Location',
        'Nationality',
        'Emirates ID',
        'Department',
        'Role',
        'Manager',
      ],
      ...employees.map((employee) => [
        employee.code,
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.status,
        employee.employmentType,
        employee.hireDate.toISOString(),
        employee.location ?? '',
        employee.nationality ?? '',
        employee.emiratesId ?? '',
        employee.department?.name ?? '',
        employee.role?.title ?? '',
        employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : '',
      ]),
    ];

    const csv = toCsv(rows);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="employees.csv"',
      },
    });
  }

  if (type === 'evaluations') {
    const evaluations = await prisma.evaluation.findMany({
      orderBy: { createdAt: 'desc' },
      include: { employee: true, cycle: true },
    });

    const rows = [
      ['Employee', 'Cycle', 'Status', 'Overall Score', 'Manager Score', 'Final Rating', 'Created At'],
      ...evaluations.map((evaluation) => [
        `${evaluation.employee.firstName} ${evaluation.employee.lastName}`,
        evaluation.cycle.name,
        evaluation.status,
        evaluation.overallScore ?? '',
        evaluation.managerScore ?? '',
        evaluation.finalRating ?? '',
        evaluation.createdAt.toISOString(),
      ]),
    ];

    const csv = toCsv(rows);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="evaluations.csv"',
      },
    });
  }

  if (type === 'appraisals') {
    const letters = await prisma.appraisalLetter.findMany({
      orderBy: { createdAt: 'desc' },
      include: { evaluation: { include: { employee: true, cycle: true } } },
    });

    const rows = [
      ['Employee', 'Cycle', 'Subject', 'Issued On', 'Rating', 'Adjustment'],
      ...letters.map((letter) => [
        `${letter.evaluation.employee.firstName} ${letter.evaluation.employee.lastName}`,
        letter.evaluation.cycle.name,
        letter.subject,
        letter.issuedOn.toISOString(),
        letter.rating ?? '',
        letter.adjustment ?? '',
      ]),
    ];

    const csv = toCsv(rows);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="appraisal-letters.csv"',
      },
    });
  }

  if (type === 'improvement-plans') {
    const plans = await prisma.improvementPlan.findMany({
      orderBy: { createdAt: 'desc' },
      include: { evaluation: { include: { employee: true, cycle: true } }, manager: true },
    });

    const rows = [
      ['Employee', 'Cycle', 'Status', 'Start Date', 'End Date', 'Objectives', 'Support Plan', 'Manager'],
      ...plans.map((plan) => [
        `${plan.evaluation.employee.firstName} ${plan.evaluation.employee.lastName}`,
        plan.evaluation.cycle.name,
        plan.status,
        plan.startDate.toISOString(),
        plan.endDate?.toISOString() ?? '',
        plan.objectives,
        plan.supportPlan ?? '',
        plan.manager ? `${plan.manager.firstName} ${plan.manager.lastName}` : '',
      ]),
    ];

    const csv = toCsv(rows);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="improvement-plans.csv"',
      },
    });
  }

  if (type === 'feedback') {
    const requests = await prisma.feedbackRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { evaluation: { include: { employee: true } }, reviewer: true },
    });

    const rows = [
      ['Employee', 'Reviewer', 'Status', 'Due Date', 'Created At'],
      ...requests.map((req) => [
        `${req.evaluation.employee.firstName} ${req.evaluation.employee.lastName}`,
        `${req.reviewer.firstName} ${req.reviewer.lastName}`,
        req.status,
        req.dueDate?.toISOString() ?? '',
        req.createdAt.toISOString(),
      ]),
    ];

    const csv = toCsv(rows);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="feedback-requests.csv"',
      },
    });
  }

  return new Response('Invalid export type', { status: 400 });
}
