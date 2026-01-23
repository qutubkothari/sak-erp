import PDFDocument from 'pdfkit';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = 'nodejs';

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);

const generatePdfBuffer = async (id: string) => {
  const letter = await prisma.appraisalLetter.findUnique({
    where: { id },
    include: {
      evaluation: {
        include: {
          employee: { include: { department: true, role: true, manager: true } },
          cycle: true,
        },
      },
      approvedBy: true,
    },
  });

  if (!letter) {
    return { error: 'Appraisal letter not found' as const };
  }

  const { evaluation } = letter;
  const employee = evaluation.employee;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  doc.fontSize(18).fillColor('#2F3B42').text('Appraisal Letter', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(11).fillColor('#333333');
  doc.text(`Date: ${formatDate(letter.issuedOn)}`);
  doc.text(`Employee: ${employee.firstName} ${employee.lastName}`);
  doc.text(`Department: ${employee.department?.name ?? 'N/A'}`);
  doc.text(`Role: ${employee.role?.title ?? 'N/A'}`);
  doc.text(`Review Cycle: ${evaluation.cycle.name}`);
  doc.moveDown();

  doc.fontSize(12).fillColor('#2F3B42').text(`Subject: ${letter.subject}`);
  doc.moveDown();

  doc.fontSize(11).fillColor('#333333').text(letter.summary, {
    align: 'left',
  });

  if (letter.rating !== null || letter.adjustment) {
    doc.moveDown();
    if (letter.rating !== null) {
      doc.text(`Final Rating: ${letter.rating}`);
    }
    if (letter.adjustment) {
      doc.text(`Compensation/Adjustment Notes: ${letter.adjustment}`);
    }
  }

  doc.moveDown(2);
  doc.text('Sincerely,');
  doc.text('HR Team');
  doc.moveDown();
  if (letter.approvedBy) {
    doc.text(`Approved By: ${letter.approvedBy.firstName} ${letter.approvedBy.lastName}`);
  } else if (letter.approvalStatus) {
    doc.text(`Approval Status: ${letter.approvalStatus}`);
  }

  doc.end();

  const buffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  return { buffer } as const;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await context.params;

  const rawRole = (session.user.role || 'employee').toString().toLowerCase();
  const baseRole = rawRole === 'hr' ? 'admin' : rawRole;
  const sessionEmployeeId = session.user.employeeId || undefined;

  if (baseRole !== 'admin') {
    const letter = await prisma.appraisalLetter.findUnique({
      where: { id },
      include: { evaluation: { include: { employee: true } } },
    });

    if (!letter) {
      return new Response('Appraisal letter not found', { status: 404 });
    }

    if (
      !sessionEmployeeId ||
      (baseRole === 'manager'
        ? letter.evaluation.employee.managerId !== sessionEmployeeId
        : letter.evaluation.employeeId !== sessionEmployeeId)
    ) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  const result = await generatePdfBuffer(id);

  if ('error' in result) {
    return new Response(result.error, { status: 404 });
  }

  const pdfBytes = new Uint8Array(result.buffer);

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="appraisal-letter-${id}.pdf"`,
    },
  });
}
