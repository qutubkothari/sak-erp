import { NextRequest, NextResponse } from 'next/server';
import { pdf } from '@react-pdf/renderer';
import { AppraisalLetterPDF } from '@/lib/pdf/appraisal-letter';
import { prisma } from '@/lib/prisma';
import React from 'react';

const prismaClient = prisma as any;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const employeeId = searchParams.get('employeeId');

  if (!employeeId) {
    return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
  }

  try {
    const letter = await prismaClient.appraisalLetter.findFirst({
      where: { evaluation: { employeeId } },
      orderBy: { issuedOn: 'desc' },
      include: {
        evaluation: {
          include: {
            employee: { include: { department: true, role: true, manager: true } },
            cycle: true,
            items: { include: { competency: true } },
            managerReview: { include: { manager: true } },
          },
        },
      },
    });

    if (!letter) {
      return NextResponse.json({ error: 'No appraisal letter found for employee' }, { status: 404 });
    }

    const { evaluation } = letter;
    const employee = evaluation.employee;
    const managerReview = evaluation.managerReview;
    const managerName = managerReview?.manager
      ? `${managerReview.manager.firstName} ${managerReview.manager.lastName}`
      : employee.manager
        ? `${employee.manager.firstName} ${employee.manager.lastName}`
        : 'Manager';

    const competencyRatings = evaluation.items
      .filter((item: any) => item.type === 'COMPETENCY' && item.competency)
      .map((item: any) => ({
        name: item.competency?.name ?? 'Competency',
        rating: Number(item.finalScore ?? item.managerScore ?? item.selfScore ?? 0),
      }));

    const appraisalData = {
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeId: employee.code ?? employee.id,
      position: employee.role?.title ?? 'N/A',
      department: employee.department?.name ?? 'N/A',
      reviewPeriod: evaluation.cycle.name,
      reviewDate: letter.issuedOn.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      overallRating:
        letter.rating ??
        evaluation.finalRating ??
        evaluation.managerScore ??
        evaluation.overallScore ??
        0,
      competencyRatings,
      strengths: managerReview?.strengths ?? 'Not provided.',
      areasForImprovement: managerReview?.areasForImprovement ?? 'Not provided.',
      developmentPlan: managerReview?.developmentPlan ?? 'Not provided.',
      managerComments: managerReview?.managerComments ?? letter.summary,
      managerName,
      salaryRecommendation: managerReview?.salaryRecommendation ?? 'no-change',
      salaryIncreasePercent: managerReview?.salaryIncreasePercent ?? undefined,
      recommendedPromotion: managerReview?.recommendedPromotion ?? undefined,
    };

    const element = React.createElement(AppraisalLetterPDF, { data: appraisalData });
    // Type assertion needed due to @react-pdf/renderer typing limitations
    const pdfDoc = pdf(element as any);
    const blob = await pdfDoc.toBlob();

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Appraisal_${employeeId}_${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
