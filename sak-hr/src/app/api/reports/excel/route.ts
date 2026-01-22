import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePerformanceReport, generateEmployeeListExcel } from '@/lib/excel/export-utils';

const formatDate = (value: Date) => value.toISOString().split('T')[0];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'performance';

  try {
    let buffer: Buffer;
    let filename: string;

    if (type === 'employees') {
      const employees = await prisma.employee.findMany({
        orderBy: { createdAt: 'desc' },
        include: { department: true, role: true, manager: true },
      });

      const mapped = employees.map((employee) => ({
        id: employee.code || employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        position: employee.role?.title ?? 'N/A',
        department: employee.department?.name ?? 'N/A',
        joinDate: formatDate(employee.hireDate),
        manager: employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : 'N/A',
      }));

      buffer = await generateEmployeeListExcel(mapped);
      filename = `Employees_${Date.now()}.xlsx`;
    } else if (type === 'performance') {
      const evaluations = await prisma.evaluation.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          employee: { include: { department: true, role: true, manager: true } },
          items: { include: { competency: true } },
          cycle: true,
        },
      });

      const competencySet = new Set<string>();
      evaluations.forEach((evaluation) => {
        evaluation.items
          .filter((item) => item.type === 'COMPETENCY' && item.competency)
          .forEach((item) => competencySet.add(item.competency!.name));
      });

      const employees = evaluations.map((evaluation) => {
        const competencyRatings: Record<string, number> = {};
        evaluation.items
          .filter((item) => item.type === 'COMPETENCY' && item.competency)
          .forEach((item) => {
            const rating = item.finalScore ?? item.managerScore ?? item.selfScore ?? 0;
            competencyRatings[item.competency!.name] = rating;
          });

        const employee = evaluation.employee;
        const overallRating = evaluation.finalRating ?? evaluation.managerScore ?? evaluation.overallScore ?? 0;

        return {
          id: employee.code || employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          position: employee.role?.title ?? 'N/A',
          department: employee.department?.name ?? 'N/A',
          overallRating,
          competencyRatings,
          managerName: employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : 'N/A',
          reviewDate: formatDate(evaluation.updatedAt),
        };
      });

      const performanceData = {
        employees,
        competencies: Array.from(competencySet),
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
