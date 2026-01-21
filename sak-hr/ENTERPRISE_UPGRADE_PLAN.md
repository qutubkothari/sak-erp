# SAK HR - Enterprise Upgrade Plan for UAE Standards

## Current Assessment: 5/10 → Target: 9/10

---

## PHASE 1: CRITICAL SECURITY (Week 1) - BLOCKING
**Priority: URGENT - Cannot go live without this**

### 1.1 Authentication System
```bash
# Install dependencies
pnpm add next-auth @auth/prisma-adapter bcryptjs
pnpm add -D @types/bcryptjs
```

**Files to Create:**
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- `src/middleware.ts` - Route protection
- `src/app/login/page.tsx` - Login UI
- `src/lib/auth.ts` - Auth utilities

**Features:**
- Email/password login
- JWT session management
- Password hashing (bcrypt)
- Session expiry
- Remember me
- Logout

### 1.2 Role-Based Access Control (RBAC)
**Roles to implement:**
- Super Admin (full access)
- HR Manager (all HR functions)
- Department Manager (view team only)
- Employee (self-service only)

**Implementation:**
```typescript
// src/lib/rbac.ts
export const permissions = {
  'Super Admin': ['*'],
  'HR Manager': ['employees:*', 'reviews:*', 'reports:*'],
  'Department Manager': ['employees:view', 'reviews:manage'],
  'Employee': ['profile:view', 'evaluations:view']
}
```

### 1.3 Audit Trails
**Track:**
- Who did what, when
- Before/after values for edits
- IP address
- Session info
- Failed login attempts

---

## PHASE 2: UAE COMPLIANCE (Week 2-3) - BUSINESS CRITICAL

### 2.1 MOHRE Integration
**Requirements:**
- Labour contract templates (English + Arabic)
- MOL establishment registration
- Work permit tracking
- Sick leave certificates
- Termination procedures

**Files to Create:**
```
src/lib/uae/
├── mohre-integration.ts
├── labour-contracts.ts
├── work-permits.ts
└── compliance-checks.ts
```

### 2.2 End of Service Benefits Calculator
**UAE Labour Law (Federal Decree-Law No. 33 of 2021):**

```typescript
// src/lib/uae/gratuity.ts
export function calculateGratuity(
  joiningDate: Date,
  leavingDate: Date,
  lastBasicSalary: number,
  resignedOrTerminated: 'RESIGNED' | 'TERMINATED'
) {
  const years = differenceInYears(leavingDate, joiningDate);
  const days = differenceInDays(leavingDate, joiningDate);
  
  let gratuityDays = 0;
  
  // Less than 1 year: No gratuity
  if (years < 1) return 0;
  
  // 1-5 years: 21 days per year
  if (years <= 5) {
    gratuityDays = years * 21;
  } else {
    // First 5 years: 21 days/year = 105 days
    // After 5 years: 30 days/year
    gratuityDays = (5 * 21) + ((years - 5) * 30);
  }
  
  // If resigned (not terminated), gratuity reduced for <5 years
  if (resignedOrTerminated === 'RESIGNED' && years < 5) {
    if (years < 1) return 0;
    if (years >= 1 && years < 3) return 0; // No gratuity
    if (years >= 3 && years < 5) gratuityDays *= 0.33; // 1/3rd only
  }
  
  // Daily wage = Basic Salary / 30
  const dailyWage = lastBasicSalary / 30;
  const gratuityAmount = gratuityDays * dailyWage;
  
  // Max gratuity = 2 years basic salary
  const maxGratuity = lastBasicSalary * 24;
  
  return Math.min(gratuityAmount, maxGratuity);
}
```

### 2.3 WPS (Wage Protection System) File Generation
**MOL-compliant SIF file format:**

```typescript
// src/lib/uae/wps-generator.ts
export function generateWPSSIF(
  payrollMonth: string,
  employees: Employee[],
  establishmentId: string,
  bankCode: string
): string {
  // EDR: Employee Detail Record format
  const records = employees.map(emp => {
    const fields = [
      'EDR',                          // Record type
      establishmentId,                 // MOL Establishment ID
      emp.labourCardNumber,           // Labour card number
      emp.bankAccount,                // Bank account
      emp.bankCode || bankCode,       // Bank routing code
      emp.basicSalary.toFixed(2),     // Basic salary
      emp.allowances.toFixed(2),      // Allowances
      emp.deductions.toFixed(2),      // Deductions
      emp.netSalary.toFixed(2),       // Net salary
      payrollMonth,                   // YYYYMM
      emp.workDays || '30',           // Days worked
      emp.nationality,                // Nationality code
      emp.passportNumber,             // Passport
      emp.visaNumber,                 // Visa number
      emp.employeeCode                // Employee reference
    ];
    
    return fields.join('|');
  });
  
  // SCR: Salary Component Record (header)
  const header = [
    'SCR',
    establishmentId,
    payrollMonth,
    records.length.toString(),
    records.reduce((sum, r) => sum + parseFloat(r.split('|')[8]), 0).toFixed(2)
  ].join('|');
  
  return [header, ...records].join('\n');
}
```

### 2.4 UAE Leave Management
**Annual Leave Rules:**
```typescript
// src/lib/uae/leave-entitlement.ts
export function calculateAnnualLeaveEntitlement(joiningDate: Date): number {
  const months = differenceInMonths(new Date(), joiningDate);
  
  // First year: 2 days per month (pro-rata)
  if (months < 12) {
    return Math.floor(months * 2);
  }
  
  // After 1 year: 30 days per year
  return 30;
}

export function calculateSickLeaveEntitlement(): {
  fullPay: number;
  halfPay: number;
  unpaid: number;
} {
  return {
    fullPay: 15,    // First 15 days: Full pay
    halfPay: 30,    // Next 30 days: Half pay
    unpaid: 45      // Remaining 45 days: Unpaid
  };
}
```

### 2.5 Emirates ID & Visa Tracking
**Expiry Alerts:**
```typescript
// src/lib/uae/document-tracking.ts
export function getExpiringDocuments(employees: Employee[]): Alert[] {
  const alerts: Alert[] = [];
  const today = new Date();
  
  employees.forEach(emp => {
    // Emirates ID expiry (warn 90 days before)
    if (emp.emiratesIdExpiry) {
      const daysToExpiry = differenceInDays(emp.emiratesIdExpiry, today);
      if (daysToExpiry <= 90 && daysToExpiry > 0) {
        alerts.push({
          type: 'EMIRATES_ID_EXPIRING',
          employee: emp,
          daysRemaining: daysToExpiry,
          severity: daysToExpiry <= 30 ? 'CRITICAL' : 'WARNING'
        });
      }
    }
    
    // Visa expiry (warn 60 days before)
    if (emp.visaExpiry) {
      const daysToExpiry = differenceInDays(emp.visaExpiry, today);
      if (daysToExpiry <= 60 && daysToExpiry > 0) {
        alerts.push({
          type: 'VISA_EXPIRING',
          employee: emp,
          daysRemaining: daysToExpiry,
          severity: daysToExpiry <= 30 ? 'CRITICAL' : 'WARNING'
        });
      }
    }
    
    // Labour card expiry (warn 90 days before)
    if (emp.labourCardExpiry) {
      const daysToExpiry = differenceInDays(emp.labourCardExpiry, today);
      if (daysToExpiry <= 90 && daysToExpiry > 0) {
        alerts.push({
          type: 'LABOUR_CARD_EXPIRING',
          employee: emp,
          daysRemaining: daysToExpiry,
          severity: daysToExpiry <= 30 ? 'CRITICAL' : 'WARNING'
        });
      }
    }
  });
  
  return alerts;
}
```

---

## PHASE 3: PROFESSIONAL UI/UX (Week 4) - USER EXPERIENCE

### 3.1 Replace CSS Charts with Recharts
```bash
pnpm add recharts
```

**Before (Amateur):**
```tsx
<div style={{ width: `${percentage}%` }} className="bg-[#6F4E37]" />
```

**After (Professional):**
```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

<BarChart width={600} height={300} data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="value" fill="#6F4E37" />
</BarChart>
```

### 3.2 Add Toast Notifications
```bash
pnpm add sonner
```

**Replace:**
```typescript
alert('Employee created!');  // ❌ Amateur
```

**With:**
```typescript
import { toast } from 'sonner';

toast.success('Employee created successfully!', {
  description: `${employee.name} has been added to the system`,
  action: {
    label: 'View',
    onClick: () => router.push(`/employees/${employee.id}`)
  }
});
```

### 3.3 Add Loading States
```tsx
// Replace all buttons
{loading ? (
  <button disabled className="opacity-50 cursor-not-allowed">
    <Spinner className="mr-2" />
    Saving...
  </button>
) : (
  <button>Save</button>
)}

// Add skeleton loaders for tables
{loading ? (
  <SkeletonTable rows={5} columns={7} />
) : (
  <Table data={employees} />
)}
```

### 3.4 Form Validation with React Hook Form + Zod
```bash
pnpm add react-hook-form @hookform/resolvers zod
```

```typescript
// src/schemas/employee.ts
import { z } from 'zod';

export const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  emiratesId: z.string().regex(
    /^784-\d{4}-\d{7}-\d$/,
    'Emirates ID must be in format: 784-XXXX-XXXXXXX-X'
  ),
  phone: z.string().regex(
    /^(\+971|0)(50|51|52|54|55|56|58)\d{7}$/,
    'Invalid UAE mobile number'
  ),
  joiningDate: z.date().max(new Date(), 'Joining date cannot be in future')
});
```

### 3.5 Arabic/RTL Support
```bash
pnpm add next-intl
```

**Configuration:**
```typescript
// src/i18n.ts
export const locales = ['en', 'ar'] as const;

export const messages = {
  en: {
    employees: {
      title: 'Employees',
      addNew: 'Add New Employee',
      search: 'Search employees...'
    }
  },
  ar: {
    employees: {
      title: 'الموظفين',
      addNew: 'إضافة موظف جديد',
      search: 'البحث عن الموظفين...'
    }
  }
};
```

**RTL Layout:**
```css
/* globals.css */
[dir="rtl"] {
  direction: rtl;
}

[dir="rtl"] .ml-4 {
  margin-left: 0;
  margin-right: 1rem;
}
```

---

## PHASE 4: ADVANCED FEATURES (Week 5-6) - ENTERPRISE

### 4.1 Professional PDF Reports
```bash
pnpm add @react-pdf/renderer
```

**Employment Contract:**
```tsx
// src/reports/employment-contract.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const ContractPDF = ({ employee, company }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.titleEn}>EMPLOYMENT CONTRACT</Text>
        <Text style={styles.titleAr}>عقد العمل</Text>
      </View>
      
      <View style={styles.section}>
        <Text>Between: {company.nameEn} / {company.nameAr}</Text>
        <Text>MOL Establishment ID: {company.molId}</Text>
        <Text>And: {employee.nameEn} / {employee.nameAr}</Text>
        <Text>Passport No: {employee.passportNumber}</Text>
        <Text>Nationality: {employee.nationality}</Text>
      </View>
      
      <View style={styles.terms}>
        <Text style={styles.clause}>1. Position: {employee.position}</Text>
        <Text style={styles.clause}>2. Basic Salary: AED {employee.basicSalary}</Text>
        <Text style={styles.clause}>3. Housing Allowance: AED {employee.housingAllowance}</Text>
        <Text style={styles.clause}>4. Contract Duration: {employee.contractType}</Text>
        <Text style={styles.clause}>5. Annual Leave: 30 calendar days</Text>
        <Text style={styles.clause}>6. Ticket Allowance: Annual</Text>
      </View>
    </Page>
  </Document>
);
```

### 4.2 Excel Export with Formatting
```bash
pnpm add exceljs
```

```typescript
// src/lib/excel-export.ts
import ExcelJS from 'exceljs';

export async function exportEmployeesToExcel(employees: Employee[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Employees');
  
  // Header styling
  sheet.columns = [
    { header: 'Employee Code', key: 'code', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Position', key: 'position', width: 20 },
    { header: 'Emirates ID', key: 'emiratesId', width: 20 },
    { header: 'Basic Salary', key: 'basicSalary', width: 15 },
    { header: 'Status', key: 'status', width: 12 }
  ];
  
  // Header row styling
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '6F4E37' }
  };
  sheet.getRow(1).font.color = { argb: 'FFFFFF' };
  
  // Add data
  employees.forEach(emp => {
    sheet.addRow({
      code: emp.employeeCode,
      name: emp.name,
      department: emp.department,
      position: emp.position,
      emiratesId: emp.emiratesId,
      basicSalary: emp.basicSalary,
      status: emp.status
    });
  });
  
  // Add total row
  const lastRow = sheet.lastRow.number + 1;
  sheet.getCell(`A${lastRow}`).value = 'TOTAL EMPLOYEES:';
  sheet.getCell(`A${lastRow}`).font = { bold: true };
  sheet.getCell(`B${lastRow}`).value = employees.length;
  
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
```

### 4.3 Email Notifications
```bash
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

```typescript
// src/lib/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendDocumentExpiryAlert(
  employee: Employee,
  documentType: string,
  daysRemaining: number
) {
  await transporter.sendMail({
    from: 'HR System <hr@company.ae>',
    to: `${employee.email}, hr@company.ae`,
    subject: `⚠️ ${documentType} Expiring Soon - ${employee.name}`,
    html: `
      <div style="font-family: Arial; padding: 20px;">
        <h2 style="color: #6F4E37;">Document Expiry Alert</h2>
        <p>Dear ${employee.name},</p>
        <p>This is to inform you that your <strong>${documentType}</strong> will expire in <strong>${daysRemaining} days</strong>.</p>
        <p><strong>Document Details:</strong></p>
        <ul>
          <li>Type: ${documentType}</li>
          <li>Current Expiry: ${employee[`${documentType}Expiry`]}</li>
          <li>Days Remaining: ${daysRemaining}</li>
        </ul>
        <p>Please contact HR to initiate the renewal process.</p>
        <p style="color: #888; font-size: 12px;">
          This is an automated notification from SAK HR System.
        </p>
      </div>
    `
  });
}
```

### 4.4 Advanced Search & Filters
```tsx
// src/components/EmployeeSearch.tsx
import { useState } from 'react';

export function EmployeeSearch({ onSearch }) {
  const [filters, setFilters] = useState({
    keyword: '',
    department: '',
    position: '',
    status: '',
    nationality: '',
    visaExpiryFrom: '',
    visaExpiryTo: '',
    salaryMin: '',
    salaryMax: ''
  });
  
  return (
    <div className="grid grid-cols-4 gap-4 p-4 bg-white rounded shadow">
      <input
        type="text"
        placeholder="Search by name, code, Emirates ID..."
        value={filters.keyword}
        onChange={e => setFilters({ ...filters, keyword: e.target.value })}
        className="col-span-2"
      />
      
      <select
        value={filters.department}
        onChange={e => setFilters({ ...filters, department: e.target.value })}
      >
        <option value="">All Departments</option>
        {departments.map(d => <option key={d}>{d}</option>)}
      </select>
      
      <select
        value={filters.status}
        onChange={e => setFilters({ ...filters, status: e.target.value })}
      >
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="PROBATION">Probation</option>
        <option value="INACTIVE">Inactive</option>
      </select>
      
      <input
        type="number"
        placeholder="Min Salary"
        value={filters.salaryMin}
        onChange={e => setFilters({ ...filters, salaryMin: e.target.value })}
      />
      
      <input
        type="number"
        placeholder="Max Salary"
        value={filters.salaryMax}
        onChange={e => setFilters({ ...filters, salaryMax: e.target.value })}
      />
      
      <button
        onClick={() => onSearch(filters)}
        className="bg-[#6F4E37] text-white px-4 py-2 rounded"
      >
        Search
      </button>
    </div>
  );
}
```

---

## PHASE 5: PRODUCTION READINESS (Week 7) - OPERATIONS

### 5.1 Error Handling & Monitoring
```bash
pnpm add @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV
});
```

### 5.2 Database Backup Strategy
```bash
# Daily automated backups
0 2 * * * pg_dump sak_hr > /backups/sak_hr_$(date +\%Y\%m\%d).sql
```

### 5.3 Performance Optimization
- Add database indexes on frequently queried fields
- Implement Redis caching for static data
- Enable Next.js image optimization
- Add CDN for static assets
- Compress API responses

### 5.4 Testing
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
```

```typescript
// src/__tests__/gratuity.test.ts
import { calculateGratuity } from '../lib/uae/gratuity';

describe('UAE Gratuity Calculator', () => {
  it('should return 0 for service less than 1 year', () => {
    const result = calculateGratuity(
      new Date('2024-01-01'),
      new Date('2024-06-01'),
      10000,
      'TERMINATED'
    );
    expect(result).toBe(0);
  });
  
  it('should calculate correctly for 3 years service (resignation)', () => {
    const result = calculateGratuity(
      new Date('2021-01-01'),
      new Date('2024-01-01'),
      10000,
      'RESIGNED'
    );
    // 3 years resigned = 1/3 of (3 * 21 days)
    // 63 days * 0.33 = ~21 days
    // 21 days * (10000/30) = 7000
    expect(result).toBeCloseTo(7000, 0);
  });
});
```

---

## IMPLEMENTATION PRIORITY

### Week 1 (CRITICAL - MUST HAVE)
1. ✅ Authentication system
2. ✅ Basic RBAC
3. ✅ Audit logging
4. ✅ Session management

### Week 2 (HIGH - UAE COMPLIANCE)
1. ✅ Gratuity calculator
2. ✅ Leave entitlement engine
3. ✅ Document expiry tracking
4. ✅ WPS file generation

### Week 3 (HIGH - UX)
1. ✅ Replace charts (Recharts)
2. ✅ Toast notifications
3. ✅ Form validation
4. ✅ Loading states

### Week 4 (MEDIUM - FEATURES)
1. ✅ PDF reports
2. ✅ Excel export
3. ✅ Email notifications
4. ✅ Advanced search

### Week 5 (MEDIUM - POLISH)
1. ✅ Arabic/RTL support
2. ✅ Mobile responsive
3. ✅ Accessibility
4. ✅ Error handling

### Week 6-7 (PRODUCTION)
1. ✅ Testing
2. ✅ Monitoring
3. ✅ Backups
4. ✅ Documentation

---

## BUDGET ESTIMATE

**Development Time:**
- Phase 1-2: 80 hours (2 weeks)
- Phase 3-4: 80 hours (2 weeks)
- Phase 5: 40 hours (1 week)
- **Total: 200 hours (~5 weeks)**

**Third-Party Costs (Annual):**
- Email service (SendGrid/Mailgun): $120/year
- Error tracking (Sentry): $26/month = $312/year
- Redis cache (Upstash): Free tier OK
- Backup storage (AWS S3): ~$50/year
- **Total recurring: ~$500/year**

---

## SUCCESS METRICS

After completion, you should have:

✅ **Security:** Login, MFA, RBAC, audit trails  
✅ **Compliance:** MOHRE-ready, WPS files, gratuity calculator  
✅ **UX:** Professional charts, toasts, validation, Arabic support  
✅ **Features:** PDF/Excel reports, emails, advanced search  
✅ **Quality:** Tests, monitoring, backups, documentation  

**Final Rating Target: 9/10** (Enterprise-grade UAE HR system)

---

## COMPARISON: CURRENT vs. ENTERPRISE

| Feature | Current | Enterprise Target |
|---------|---------|-------------------|
| Authentication | ❌ None | ✅ NextAuth + MFA |
| Charts | ❌ CSS bars | ✅ Recharts |
| Notifications | ❌ Alerts | ✅ Toast (Sonner) |
| Validation | ❌ Basic | ✅ Zod schemas |
| Loading States | ❌ None | ✅ Spinners + Skeletons |
| Error Handling | ❌ None | ✅ Sentry monitoring |
| Arabic Support | ❌ None | ✅ RTL + i18n |
| Mobile | ❌ Desktop only | ✅ Fully responsive |
| Exports | ❌ CSV only | ✅ PDF + Excel formatted |
| Search | ❌ None | ✅ Advanced multi-filter |
| Email | ❌ None | ✅ Automated alerts |
| Compliance | ❌ Generic | ✅ UAE Labour Law |
| WPS | ❌ None | ✅ MOL SIF files |
| Gratuity | ❌ Manual | ✅ Auto-calculator |
| Tests | ❌ None | ✅ Vitest + RTL |
| Monitoring | ❌ None | ✅ Sentry + logs |

---

## NEXT STEPS

**I can help you implement this in order. What would you like to start with?**

1. **Critical Path:** Authentication + RBAC (Week 1)
2. **Business Value:** UAE Compliance features (Week 2)
3. **User Experience:** Professional UI upgrades (Week 3)
4. **Full Implementation:** All phases systematically

**Your choice - where should we begin?**
