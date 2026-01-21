import { NextRequest, NextResponse } from 'next/server';
import { pdf } from '@react-pdf/renderer';
import { AppraisalLetterPDF } from '@/lib/pdf/appraisal-letter';
import React from 'react';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const employeeId = searchParams.get('employeeId');

  if (!employeeId) {
    return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
  }

  try {
    // TODO: Fetch actual data from database
    const appraisalData = {
      employeeName: 'Ahmed Al-Mansoori',
      employeeId: employeeId,
      position: 'Senior Software Engineer',
      department: 'Engineering',
      reviewPeriod: 'Q4 2024',
      reviewDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      overallRating: 4,
      competencyRatings: [
        { name: 'Communication', rating: 4 },
        { name: 'Problem Solving', rating: 5 },
        { name: 'Technical Excellence', rating: 4 },
        { name: 'Teamwork', rating: 5 },
        { name: 'Leadership', rating: 3 },
      ],
      strengths:
        'Demonstrates exceptional problem-solving abilities and technical expertise. Successfully led cloud migration project resulting in significant cost savings. Excellent collaborator and mentor to junior team members.',
      areasForImprovement:
        'Could benefit from developing stronger leadership presence in cross-functional meetings. Recommended to work on strategic planning and long-term project roadmapping skills.',
      developmentPlan:
        'Enroll in advanced cloud architecture certification program (AWS Solutions Architect Professional). Participate in leadership development workshop scheduled for Q1 2025. Take lead role in upcoming enterprise integration project.',
      managerComments:
        'Ahmed has consistently exceeded expectations this quarter. His technical contributions have been instrumental in our team success. With continued development in leadership areas, he is well-positioned for promotion to Lead Engineer role.',
      managerName: 'Sarah Johnson',
      salaryRecommendation: 'increase',
      salaryIncreasePercent: 8,
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
