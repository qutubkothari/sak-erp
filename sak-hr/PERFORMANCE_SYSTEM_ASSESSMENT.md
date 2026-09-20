# SAK Performance Evaluation System - Enterprise Assessment

## SCOPE: Employee Performance Management ONLY
*(NOT Full HRMS - Focused on Reviews, Appraisals, KPIs, Feedback)*

---

## Current Rating: **6.5/10** → Target: **9/10**

### ✅ What You Already Have (GOOD)

**Core Performance Features:**
- ✅ Employee directory with UAE-compliant data (locations, nationalities)
- ✅ Review cycles management (DRAFT/ACTIVE/CLOSED)
- ✅ Competency framework
- ✅ KPI library with weights
- ✅ Evaluation forms
- ✅ Performance analytics dashboard
- ✅ Rating distribution visualization
- ✅ AI-powered insights (Gemini/OpenAI)
- ✅ CSV export for reports
- ✅ Inline CRUD operations
- ✅ Role switcher (HR/Manager/Employee)
- ✅ Department-based filtering
- ✅ UAE-themed professional design

**This is actually a SOLID foundation for performance management!**

---

## ❌ Critical Gaps for Enterprise Performance System

### 1. AUTHENTICATION & SECURITY (BLOCKING - Cannot Launch)
```
❌ No login system
❌ No user authentication
❌ No session management
❌ No role-based access (HR vs Manager vs Employee views)
❌ No audit trail (who reviewed whom, when)
```

**Impact:** Anyone can access/modify anyone's performance data ⚠️

### 2. PERFORMANCE WORKFLOWS (CORE MISSING)
```
❌ No goal-setting module (annual objectives)
❌ No self-assessment (employee fills first)
❌ No manager assessment workflow
❌ No multi-level approval (manager → department head → HR)
❌ No 360-degree feedback
❌ No mid-year reviews
❌ No performance calibration sessions
❌ No performance improvement plans (PIP) workflow
```

**Impact:** Manual, unstructured review process

### 3. NOTIFICATION SYSTEM (CRITICAL)
```
❌ No email alerts for:
  - Review cycle start
  - Pending assessments
  - Overdue reviews
  - Approval requests
  - Feedback requests
❌ No dashboard notifications
❌ No reminder system
```

**Impact:** Reviews get forgotten, deadlines missed

### 4. ADVANCED ANALYTICS (NEEDED FOR INSIGHTS)
```
❌ No trend analysis (performance over time)
❌ No department comparisons
❌ No top/bottom performers identification
❌ No promotion readiness reports
❌ No flight risk analysis
❌ No succession planning data
❌ No performance vs. salary correlation
```

**Impact:** Limited strategic HR insights

### 5. PROFESSIONAL REPORTING (CURRENT: CSV ONLY)
```
❌ No PDF performance reports
❌ No formatted appraisal letters
❌ No performance review summary documents
❌ No goal achievement reports
❌ No manager effectiveness reports
```

**Impact:** Unprofessional output, manual formatting needed

### 6. UI/UX QUALITY ISSUES
```
❌ Amateur CSS bar charts (should use Recharts/Chart.js)
❌ Using alert() popups (should use toast notifications)
❌ No loading states during API calls
❌ No form validation feedback
❌ No empty states ("No evaluations yet")
❌ No search/filter on tables
❌ Not mobile-responsive
❌ No Arabic language support (UAE requirement)
```

**Impact:** Poor user experience, frustration

### 7. DATA MANAGEMENT
```
❌ No bulk import (import 100 employees from Excel)
❌ No data validation on forms
❌ No duplicate prevention
❌ No version history (track evaluation changes)
❌ No soft deletes (restore accidentally deleted data)
❌ No data export formats (PDF, Excel with charts)
```

**Impact:** Manual data entry, potential errors

---

## 🎯 ENTERPRISE PERFORMANCE SYSTEM UPGRADE PLAN

### PHASE 1: CRITICAL FOUNDATION (Week 1) - MUST HAVE

#### 1.1 Authentication System
```bash
pnpm add next-auth @auth/prisma-adapter bcryptjs
```

**Implementation:**
```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' }
      },
      async authorize(credentials) {
        const employee = await prisma.employee.findUnique({
          where: { email: credentials.email },
          include: { department: true, role: true }
        });
        
        if (!employee || !bcrypt.compareSync(credentials.password, employee.password)) {
          return null;
        }
        
        return {
          id: employee.id,
          email: employee.email,
          name: employee.name,
          role: employee.role.name, // HR_MANAGER, DEPARTMENT_MANAGER, EMPLOYEE
          departmentId: employee.departmentId
        };
      }
    })
  ],
  callbacks: {
    session({ session, token }) {
      session.user.role = token.role;
      session.user.departmentId = token.departmentId;
      return session;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

**Roles for Performance System:**
- `SUPER_ADMIN` - Full system access
- `HR_MANAGER` - Manage all reviews, analytics, reports
- `DEPARTMENT_MANAGER` - Manage team reviews only
- `EMPLOYEE` - View own evaluations, submit self-assessments

#### 1.2 Protected Routes
```typescript
// src/middleware.ts
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      const path = req.nextUrl.pathname;
      
      // Everyone needs to be logged in
      if (!token) return false;
      
      // Only HR can access analytics and reports
      if (path.startsWith('/performance/analytics') || 
          path.startsWith('/performance/reports')) {
        return token.role === 'HR_MANAGER' || token.role === 'SUPER_ADMIN';
      }
      
      return true;
    }
  }
});

export const config = {
  matcher: ['/performance/:path*', '/dashboard/:path*']
};
```

---

### PHASE 2: CORE WORKFLOWS (Week 2-3) - BUSINESS CRITICAL

#### 2.1 Goal Setting Module
```typescript
// New page: src/app/performance/goals/page.tsx

interface Goal {
  id: string;
  employeeId: string;
  reviewCycleId: string;
  title: string;
  description: string;
  category: 'PERFORMANCE' | 'DEVELOPMENT' | 'BEHAVIORAL';
  weight: number;
  targetDate: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  kpiId?: string;
  measurementCriteria: string;
  selfRating?: number;
  managerRating?: number;
  achievements?: string;
}

// API: /api/goals
// Features:
// - Set SMART goals at cycle start
// - Track progress throughout year
// - Self-rate achievement
// - Manager validates ratings
// - Link goals to KPIs
```

#### 2.2 Self-Assessment Workflow
```typescript
// src/app/performance/self-assessment/page.tsx

// Step 1: Employee sees pending review notification
// Step 2: Employee fills self-assessment form:
//   - Rate own performance on each competency
//   - Provide achievements/examples
//   - List challenges faced
//   - Set future goals
// Step 3: Submit to manager
// Step 4: Manager receives notification

// Status flow: PENDING → SELF_ASSESSED → MANAGER_REVIEWED → CALIBRATED → FINALIZED
```

#### 2.3 Manager Assessment Workflow
```typescript
// src/app/performance/team-reviews/page.tsx

// Manager Dashboard shows:
// - Pending self-assessments from team
// - Overdue reviews
// - Team performance distribution

// Manager can:
// - View employee's self-assessment
// - Add manager ratings (can differ from self-rating)
// - Provide written feedback
// - Recommend salary increase %
// - Recommend promotion (Yes/No/Maybe)
// - Submit for calibration
```

#### 2.4 Calibration Session
```typescript
// src/app/performance/calibration/page.tsx

// HR organizes calibration meeting
// View all employees in department side-by-side
// Compare ratings across managers
// Identify rating inflation/deflation
// Adjust ratings for fairness
// Force distribution (20% top, 70% middle, 10% bottom)
// Finalize ratings
```

#### 2.5 360-Degree Feedback
```typescript
// src/app/performance/360-feedback/page.tsx

interface FeedbackRequest {
  employeeId: string; // Person being reviewed
  requesterId: string; // Manager who initiated
  respondents: {
    employeeId: string;
    relationship: 'PEER' | 'DIRECT_REPORT' | 'MANAGER' | 'CROSS_FUNCTIONAL';
    status: 'PENDING' | 'SUBMITTED';
  }[];
  questions: {
    competencyId: string;
    question: string;
    type: 'RATING' | 'TEXT';
  }[];
}

// Anonymous feedback compilation
// Minimum 3 respondents for anonymity
```

---

### PHASE 3: NOTIFICATIONS & AUTOMATION (Week 4)

#### 3.1 Email Notification System
```bash
pnpm add nodemailer react-email
```

```typescript
// src/lib/email/templates/review-reminder.tsx
import { Html, Body, Container, Heading, Text, Button } from '@react-email/components';

export function ReviewReminderEmail({ employeeName, dueDate, reviewCycle }) {
  return (
    <Html>
      <Body style={{ fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ padding: '20px' }}>
          <Heading style={{ color: '#6F4E37' }}>
            Performance Review Reminder
          </Heading>
          <Text>Dear {employeeName},</Text>
          <Text>
            Your self-assessment for <strong>{reviewCycle}</strong> is due on <strong>{dueDate}</strong>.
          </Text>
          <Button 
            href="https://hr.company.ae/performance/self-assessment"
            style={{ background: '#6F4E37', color: 'white', padding: '12px 24px' }}
          >
            Start Assessment
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

**Automated Emails:**
- Review cycle opened (to all employees)
- Self-assessment reminder (3 days before due)
- Overdue self-assessment (daily until submitted)
- Manager review reminder
- Calibration meeting invite
- Final rating notification
- Performance improvement plan notification

#### 3.2 In-App Notifications
```typescript
// src/components/NotificationBell.tsx
import { Bell } from 'lucide-react';

export function NotificationBell() {
  const { data: notifications } = useQuery('/api/notifications');
  const unreadCount = notifications?.filter(n => !n.read).length || 0;
  
  return (
    <div className="relative">
      <Bell className="cursor-pointer" />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </div>
  );
}
```

---

### PHASE 4: PROFESSIONAL UI/UX (Week 5)

#### 4.1 Replace Charts with Recharts
```bash
pnpm add recharts
```

**Before (Amateur CSS):**
```tsx
<div style={{ width: `${percentage}%`, height: '20px', background: '#6F4E37' }} />
```

**After (Professional):**
```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <BarChart data={performanceData}>
    <XAxis dataKey="department" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="avgRating" fill="#6F4E37" name="Average Rating" />
    <Bar dataKey="employeeCount" fill="#E8DCC4" name="Employees" />
  </BarChart>
</ResponsiveContainer>
```

**Add Multiple Chart Types:**
- Line chart: Performance trends over time
- Radar chart: Competency profile comparison
- Scatter plot: Performance vs. potential matrix (9-box grid)
- Pie chart: Rating distribution

#### 4.2 Toast Notifications
```bash
pnpm add sonner
```

**Replace all alert() calls:**
```typescript
// Before
alert('Employee updated successfully!');

// After
import { toast } from 'sonner';

toast.success('Employee updated successfully!', {
  description: 'Changes have been saved',
  action: {
    label: 'View',
    onClick: () => router.push(`/employees/${id}`)
  }
});
```

#### 4.3 Form Validation
```bash
pnpm add react-hook-form @hookform/resolvers zod
```

```typescript
// src/schemas/evaluation.schema.ts
import { z } from 'zod';

export const evaluationSchema = z.object({
  competencyRatings: z.array(z.object({
    competencyId: z.string(),
    rating: z.number().min(1).max(5),
    comments: z.string().min(10, 'Please provide detailed feedback (min 10 characters)')
  })),
  overallRating: z.number().min(1).max(5),
  strengths: z.string().min(50, 'Please elaborate on strengths'),
  areasForImprovement: z.string().min(50, 'Please provide constructive feedback'),
  recommendSalaryIncrease: z.number().min(0).max(30),
  recommendPromotion: z.boolean()
});
```

#### 4.4 Loading States & Skeletons
```tsx
// src/components/SkeletonTable.tsx
export function SkeletonTable({ rows = 5, columns = 6 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-10 bg-gray-200 rounded animate-pulse flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Usage
{loading ? <SkeletonTable /> : <EvaluationsTable data={evaluations} />}
```

---

### PHASE 5: ADVANCED ANALYTICS (Week 6)

#### 5.1 Performance Trends
```typescript
// src/app/performance/analytics/trends/page.tsx

// Charts to add:
// 1. Performance over time (line chart per employee)
// 2. Department average trends
// 3. Competency strength/weakness analysis
// 4. Rating distribution by level/department
// 5. Top 10 performers
// 6. Bottom 10 needing support
```

#### 5.2 9-Box Grid (Performance vs. Potential)
```tsx
// src/components/NineBoxGrid.tsx

export function NineBoxGrid({ employees }) {
  // X-axis: Performance (Low, Medium, High)
  // Y-axis: Potential (Low, Medium, High)
  
  // Categories:
  // - Stars (High performance, High potential) - Promote/Retain
  // - High Performers (High performance, Medium potential) - Reward
  // - Solid Citizens (Medium performance, Medium potential) - Develop
  // - Underperformers (Low performance, Low potential) - PIP or Exit
  
  return (
    <div className="grid grid-cols-3 grid-rows-3 h-[600px] border">
      {/* 9 boxes with employee avatars positioned */}
    </div>
  );
}
```

#### 5.3 Succession Planning
```typescript
// Identify ready-now successors for key positions
// Track promotion readiness
// Identify skill gaps for development
```

---

### PHASE 6: PROFESSIONAL REPORTS (Week 7)

#### 6.1 PDF Performance Appraisal Letter
```bash
pnpm add @react-pdf/renderer
```

```tsx
// src/reports/appraisal-letter.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const AppraisalLetter = ({ employee, evaluation, reviewCycle }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Company Letterhead */}
      <View style={styles.header}>
        <Text style={styles.companyName}>SAK SOLUTIONS LLC</Text>
        <Text style={styles.address}>Dubai, United Arab Emirates</Text>
      </View>
      
      {/* Letter Content */}
      <View style={styles.body}>
        <Text style={styles.date}>Date: {new Date().toLocaleDateString()}</Text>
        <Text style={styles.subject}>
          Subject: Performance Appraisal - {reviewCycle.name}
        </Text>
        
        <Text style={styles.paragraph}>Dear {employee.name},</Text>
        
        <Text style={styles.paragraph}>
          We are pleased to inform you about the results of your annual performance review 
          for the period {reviewCycle.startDate} to {reviewCycle.endDate}.
        </Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Summary</Text>
          <Text>Overall Rating: {evaluation.overallRating}/5 - {getRatingLabel(evaluation.overallRating)}</Text>
          <Text>Department Ranking: Top {employee.percentile}%</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Strengths</Text>
          <Text>{evaluation.strengths}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Development Areas</Text>
          <Text>{evaluation.areasForImprovement}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salary Adjustment</Text>
          <Text>Based on your performance, we are pleased to offer a {evaluation.salaryIncreasePercent}% salary increase.</Text>
          <Text>New Basic Salary: AED {employee.newSalary}</Text>
          <Text>Effective From: {evaluation.effectiveDate}</Text>
        </View>
        
        <Text style={styles.closing}>
          We appreciate your contributions and look forward to your continued success.
        </Text>
        
        <View style={styles.signatures}>
          <View>
            <Text>_____________________</Text>
            <Text>HR Manager</Text>
          </View>
          <View>
            <Text>_____________________</Text>
            <Text>Employee Acknowledgment</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);
```

#### 6.2 Excel Reports with Charts
```bash
pnpm add exceljs
```

```typescript
// src/lib/reports/performance-summary.ts
import ExcelJS from 'exceljs';

export async function generatePerformanceSummaryExcel(employees, reviewCycle) {
  const workbook = new ExcelJS.Workbook();
  
  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Employee', key: 'name', width: 25 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Overall Rating', key: 'rating', width: 15 },
    { header: 'Rank', key: 'rank', width: 10 },
    { header: 'Salary Increase %', key: 'increase', width: 18 },
    { header: 'Promotion', key: 'promotion', width: 15 }
  ];
  
  employees.forEach(emp => summarySheet.addRow(emp));
  
  // Add chart
  const chart = summarySheet.addChart({
    type: 'bar',
    chartArea: { x: 500, y: 50, width: 400, height: 300 },
    title: 'Performance Distribution',
    dataSource: /* ... */
  });
  
  // Sheet 2: Department Breakdown
  // Sheet 3: Competency Analysis
  // Sheet 4: Goals Achievement
  
  return await workbook.xlsx.writeBuffer();
}
```

---

### PHASE 7: UAE LOCALIZATION (Week 8)

#### 7.1 Arabic Language Support
```bash
pnpm add next-intl
```

```typescript
// messages/en.json
{
  "performance": {
    "title": "Performance Management",
    "evaluations": "Evaluations",
    "goals": "Goals",
    "feedback": "Feedback",
    "rating": {
      "excellent": "Excellent",
      "good": "Good",
      "satisfactory": "Satisfactory",
      "needs_improvement": "Needs Improvement",
      "unsatisfactory": "Unsatisfactory"
    }
  }
}

// messages/ar.json
{
  "performance": {
    "title": "إدارة الأداء",
    "evaluations": "التقييمات",
    "goals": "الأهداف",
    "feedback": "التعليقات",
    "rating": {
      "excellent": "ممتاز",
      "good": "جيد",
      "satisfactory": "مرضي",
      "needs_improvement": "يحتاج تحسين",
      "unsatisfactory": "غير مرضي"
    }
  }
}
```

#### 7.2 RTL Layout Support
```css
/* src/app/globals.css */
[dir="rtl"] {
  direction: rtl;
}

[dir="rtl"] .ml-4 {
  margin-left: 0;
  margin-right: 1rem;
}

[dir="rtl"] .text-left {
  text-align: right;
}
```

---

## IMPLEMENTATION TIMELINE

### Week 1 (CRITICAL)
- ✅ NextAuth authentication
- ✅ Login/logout pages
- ✅ Protected routes
- ✅ RBAC middleware

### Week 2 (CORE WORKFLOWS)
- ✅ Goal setting module
- ✅ Self-assessment workflow
- ✅ Manager review workflow

### Week 3 (WORKFLOWS CONT.)
- ✅ Calibration sessions
- ✅ 360-degree feedback
- ✅ Performance improvement plans

### Week 4 (AUTOMATION)
- ✅ Email notification system
- ✅ In-app notifications
- ✅ Automated reminders

### Week 5 (UX UPGRADE)
- ✅ Recharts integration
- ✅ Toast notifications
- ✅ Form validation
- ✅ Loading states

### Week 6 (ANALYTICS)
- ✅ Performance trends
- ✅ 9-box grid
- ✅ Advanced dashboards

### Week 7 (REPORTS)
- ✅ PDF appraisal letters
- ✅ Excel reports with charts
- ✅ Manager effectiveness reports

### Week 8 (LOCALIZATION)
- ✅ Arabic translations
- ✅ RTL support
- ✅ Date/number formatting

---

## SUCCESS METRICS

**After 8 weeks, you'll have:**

✅ **Authentication:** Secure login, RBAC, audit trails  
✅ **Workflows:** Goal setting → Self-assessment → Manager review → Calibration → Finalization  
✅ **360 Feedback:** Peer/manager/direct report feedback collection  
✅ **Automation:** Email notifications, reminders, deadline tracking  
✅ **Professional UI:** Recharts, toasts, validation, loading states  
✅ **Analytics:** Trends, 9-box grid, succession planning  
✅ **Reports:** PDF appraisal letters, Excel with charts  
✅ **Localization:** English + Arabic, RTL support  

**Final Rating: 9/10** - Enterprise-grade Performance Management System

---

## BUDGET ESTIMATE

**Development Effort:**
- 8 weeks × 40 hours = **320 hours total**

**Third-Party Costs:**
- Email service (SendGrid): $20/month = $240/year
- AI APIs (Gemini): Already using free tier
- Error monitoring (Sentry): $26/month = $312/year
- **Total: ~$600/year**

---

## COMPARISON: CURRENT vs. ENTERPRISE

| Feature | Current | Enterprise Target |
|---------|---------|-------------------|
| Authentication | ❌ None | ✅ NextAuth + RBAC |
| Workflows | ❌ Basic | ✅ Full cycle (Goals → Assessment → Calibration) |
| 360 Feedback | ❌ None | ✅ Multi-rater system |
| Notifications | ❌ None | ✅ Email + In-app |
| Charts | ❌ CSS bars | ✅ Recharts (professional) |
| Reports | ❌ CSV only | ✅ PDF + Excel formatted |
| Search/Filter | ❌ None | ✅ Advanced multi-filter |
| Validation | ❌ Basic | ✅ Zod schemas + error display |
| Loading States | ❌ None | ✅ Skeletons + spinners |
| Arabic Support | ❌ None | ✅ Full i18n + RTL |
| Analytics | ✅ Basic | ✅ Advanced (trends, 9-box) |
| Goal Management | ❌ None | ✅ SMART goals + tracking |
| Calibration | ❌ None | ✅ Manager calibration sessions |

---

## NEXT STEPS

**Which phase should we implement first?**

### Option 1: Critical Path (Recommended)
Start with **Week 1 (Authentication)** → Can't launch without security

### Option 2: Quick Wins
Start with **Week 5 (UX Upgrade)** → Make current features look professional

### Option 3: Business Value
Start with **Week 2 (Workflows)** → Add self-assessment and manager review flows

**Your choice - what's most important right now?**
