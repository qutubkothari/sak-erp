import ExcelJS from 'exceljs';

interface PerformanceData {
  employees: {
    id: string;
    name: string;
    position: string;
    department: string;
    overallRating: number;
    competencyRatings: { [key: string]: number };
    managerName: string;
    reviewDate: string;
  }[];
  competencies: string[];
}

export async function generatePerformanceReport(data: PerformanceData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'SAK Performance Evaluation System';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  // Header styling
  summarySheet.columns = [
    { header: 'Employee ID', key: 'id', width: 15 },
    { header: 'Employee Name', key: 'name', width: 25 },
    { header: 'Position', key: 'position', width: 25 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Overall Rating', key: 'overallRating', width: 15 },
    { header: 'Manager', key: 'manager', width: 20 },
    { header: 'Review Date', key: 'reviewDate', width: 15 },
  ];

  // Style header row
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6F4E37' },
  };
  summarySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data
  data.employees.forEach((emp) => {
    summarySheet.addRow({
      id: emp.id,
      name: emp.name,
      position: emp.position,
      department: emp.department,
      overallRating: emp.overallRating,
      manager: emp.managerName,
      reviewDate: emp.reviewDate,
    });
  });

  // Apply conditional formatting for ratings
  const ratingColumn = summarySheet.getColumn('overallRating');
  ratingColumn.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 1) {
      const value = cell.value as number;
      if (value >= 4) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }, // Light green
        };
      } else if (value >= 3) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF4A3' }, // Light yellow
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC0CB' }, // Light red
        };
      }
      cell.alignment = { horizontal: 'center' };
    }
  });

  // Detailed Competencies Sheet
  const detailsSheet = workbook.addWorksheet('Competency Ratings', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }],
  });

  // Build columns dynamically
  const detailColumns = [
    { header: 'Employee ID', key: 'id', width: 15 },
    { header: 'Employee Name', key: 'name', width: 25 },
    ...data.competencies.map((comp) => ({
      header: comp,
      key: comp,
      width: 20,
    })),
    { header: 'Average', key: 'average', width: 12 },
  ];

  detailsSheet.columns = detailColumns;

  // Style header
  detailsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  detailsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6F4E37' },
  };
  detailsSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add competency data
  data.employees.forEach((emp) => {
    const rowData: any = {
      id: emp.id,
      name: emp.name,
    };

    let total = 0;
    let count = 0;

    data.competencies.forEach((comp) => {
      const rating = emp.competencyRatings[comp] || 0;
      rowData[comp] = rating;
      if (rating > 0) {
        total += rating;
        count++;
      }
    });

    rowData.average = count > 0 ? (total / count).toFixed(2) : 0;

    detailsSheet.addRow(rowData);
  });

  // Apply conditional formatting to competency ratings
  for (let col = 3; col <= detailColumns.length; col++) {
    const column = detailsSheet.getColumn(col);
    column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber > 1) {
        const value = parseFloat(cell.value as string);
        if (!isNaN(value)) {
          if (value >= 4) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF90EE90' },
            };
          } else if (value >= 3) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF4A3' },
            };
          } else if (value > 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFC0CB' },
            };
          }
          cell.alignment = { horizontal: 'center' };
        }
      }
    });
  }

  // Analytics Sheet
  const analyticsSheet = workbook.addWorksheet('Analytics');

  analyticsSheet.mergeCells('A1:D1');
  analyticsSheet.getCell('A1').value = 'Performance Analytics Dashboard';
  analyticsSheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF6F4E37' } };
  analyticsSheet.getCell('A1').alignment = { horizontal: 'center' };

  // Rating Distribution
  analyticsSheet.getCell('A3').value = 'Rating Distribution';
  analyticsSheet.getCell('A3').font = { bold: true, size: 12 };

  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  data.employees.forEach((emp) => {
    const rating = Math.round(emp.overallRating);
    if (rating >= 1 && rating <= 5) {
      ratingCounts[rating as keyof typeof ratingCounts]++;
    }
  });

  analyticsSheet.getCell('A4').value = 'Rating';
  analyticsSheet.getCell('B4').value = 'Count';
  analyticsSheet.getCell('C4').value = 'Percentage';

  let rowNum = 5;
  for (let rating = 5; rating >= 1; rating--) {
    analyticsSheet.getCell(`A${rowNum}`).value = rating;
    analyticsSheet.getCell(`B${rowNum}`).value = ratingCounts[rating as keyof typeof ratingCounts];
    analyticsSheet.getCell(`C${rowNum}`).value = {
      formula: `B${rowNum}/${data.employees.length}`,
      result: ratingCounts[rating as keyof typeof ratingCounts] / data.employees.length,
    };
    analyticsSheet.getCell(`C${rowNum}`).numFmt = '0.00%';
    rowNum++;
  }

  // Department Analysis
  analyticsSheet.getCell('E3').value = 'Department Performance';
  analyticsSheet.getCell('E3').font = { bold: true, size: 12 };

  const deptData: { [key: string]: { total: number; count: number } } = {};
  data.employees.forEach((emp) => {
    if (!deptData[emp.department]) {
      deptData[emp.department] = { total: 0, count: 0 };
    }
    deptData[emp.department].total += emp.overallRating;
    deptData[emp.department].count++;
  });

  analyticsSheet.getCell('E4').value = 'Department';
  analyticsSheet.getCell('F4').value = 'Avg Rating';
  analyticsSheet.getCell('G4').value = 'Employee Count';

  rowNum = 5;
  Object.entries(deptData).forEach(([dept, stats]) => {
    analyticsSheet.getCell(`E${rowNum}`).value = dept;
    analyticsSheet.getCell(`F${rowNum}`).value = (stats.total / stats.count).toFixed(2);
    analyticsSheet.getCell(`G${rowNum}`).value = stats.count;
    rowNum++;
  });

  // Style analytics headers
  ['A4', 'B4', 'C4', 'E4', 'F4', 'G4'].forEach((cell) => {
    analyticsSheet.getCell(cell).font = { bold: true };
    analyticsSheet.getCell(cell).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF4ECE2' },
    };
  });

  // Auto-fit columns
  [summarySheet, detailsSheet, analyticsSheet].forEach((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE8DCC4' } },
          left: { style: 'thin', color: { argb: 'FFE8DCC4' } },
          bottom: { style: 'thin', color: { argb: 'FFE8DCC4' } },
          right: { style: 'thin', color: { argb: 'FFE8DCC4' } },
        };
      });
    });
  });

  return await workbook.xlsx.writeBuffer() as Buffer;
}

export async function generateEmployeeListExcel(
  employees: {
    id: string;
    name: string;
    email: string;
    position: string;
    department: string;
    joinDate: string;
    manager: string;
  }[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Employee List');

  sheet.columns = [
    { header: 'Employee ID', key: 'id', width: 15 },
    { header: 'Full Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Position', key: 'position', width: 25 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Join Date', key: 'joinDate', width: 15 },
    { header: 'Manager', key: 'manager', width: 25 },
  ];

  // Style header
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6F4E37' },
  };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data
  employees.forEach((emp) => {
    sheet.addRow(emp);
  });

  // Add borders
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE8DCC4' } },
        left: { style: 'thin', color: { argb: 'FFE8DCC4' } },
        bottom: { style: 'thin', color: { argb: 'FFE8DCC4' } },
        right: { style: 'thin', color: { argb: 'FFE8DCC4' } },
      };
    });
  });

  return await workbook.xlsx.writeBuffer() as Buffer;
}
