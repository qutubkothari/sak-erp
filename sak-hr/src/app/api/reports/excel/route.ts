import { NextRequest, NextResponse } from 'next/server';
import { generatePerformanceReport, generateEmployeeListExcel } from '@/lib/excel/export-utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'performance';

  try {
    let buffer: Buffer;
    let filename: string;

    if (type === 'employees') {
      // TODO: Fetch actual employee data from database
      const employees = [
        {
          id: 'EMP001',
          name: 'Ahmed Al-Mansoori',
          email: 'ahmed.mansoori@sak.ae',
          position: 'Senior Software Engineer',
          department: 'Engineering',
          joinDate: '2022-03-15',
          manager: 'Sarah Johnson',
        },
        {
          id: 'EMP002',
          name: 'Fatima Al-Zaabi',
          email: 'fatima.zaabi@sak.ae',
          position: 'Product Manager',
          department: 'Product',
          joinDate: '2021-08-20',
          manager: 'Mohammed Al-Ahli',
        },
        {
          id: 'EMP003',
          name: 'Omar Hassan',
          email: 'omar.hassan@sak.ae',
          position: 'UX Designer',
          department: 'Design',
          joinDate: '2023-01-10',
          manager: 'Layla Al-Maktoum',
        },
      ];

      buffer = await generateEmployeeListExcel(employees);
      filename = `Employees_${Date.now()}.xlsx`;
    } else if (type === 'performance') {
      // TODO: Fetch actual performance data from database
      const performanceData = {
        employees: [
          {
            id: 'EMP001',
            name: 'Ahmed Al-Mansoori',
            position: 'Senior Software Engineer',
            department: 'Engineering',
            overallRating: 4,
            competencyRatings: {
              Communication: 4,
              'Problem Solving': 5,
              'Technical Excellence': 4,
              Teamwork: 5,
              Leadership: 3,
            },
            managerName: 'Sarah Johnson',
            reviewDate: '2024-12-15',
          },
          {
            id: 'EMP002',
            name: 'Fatima Al-Zaabi',
            position: 'Product Manager',
            department: 'Product',
            overallRating: 5,
            competencyRatings: {
              Communication: 5,
              'Problem Solving': 5,
              'Technical Excellence': 4,
              Teamwork: 5,
              Leadership: 5,
            },
            managerName: 'Mohammed Al-Ahli',
            reviewDate: '2024-12-14',
          },
          {
            id: 'EMP003',
            name: 'Omar Hassan',
            position: 'UX Designer',
            department: 'Design',
            overallRating: 3,
            competencyRatings: {
              Communication: 3,
              'Problem Solving': 4,
              'Technical Excellence': 3,
              Teamwork: 4,
              Leadership: 2,
            },
            managerName: 'Layla Al-Maktoum',
            reviewDate: '2024-12-13',
          },
        ],
        competencies: ['Communication', 'Problem Solving', 'Technical Excellence', 'Teamwork', 'Leadership'],
      };

      buffer = await generatePerformanceReport(performanceData);
      filename = `Performance_Report_${Date.now()}.xlsx`;
    } else {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    // Next.js Response expects Blob, ArrayBuffer, or other web types
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Excel generation error:', error);
    return NextResponse.json({ error: 'Failed to generate Excel file' }, { status: 500 });
  }
}
